const express = require("express");

const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const axios = require("axios");
// const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { keccak_512 } = require("js-sha3");



const JWT_SECRET="sdfghjkl";
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  name: { type: String }, 
  email: { type: String, required: true, unique: true },
  otp: String,
  otpExpires: Date,
  tempMail: {
    address: String,
    createdAt: Date,
  },
  sessions: [
    {
      token: String,
      fingerprint: String
    }
  ],
  tempEmail: String,
  tempEmailCreated: Date,
});

const User = mongoose.model("User", userSchema);

const BreachSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  breachedSite: { type: String, required: true },
  domain: { type: String },
  industry: { type: String },
  leakedData: { type: [String], default: [] },
  breachDate: { type: String },
  breachRecords: { type: Number },
  passwordRisk: { type: String },
  verified: { type: Boolean, default: false },
  references: { type: String }
}, { timestamps: true });


const Breach = mongoose.model("Breach", BreachSchema);

const virusTotalCheckSchema = new mongoose.Schema({
  user: { type: String, required: true }, // User's email
  checks: [
      {
          domain: { type: String, required: true },
          malicious: { type: Boolean, required: true },
          source: { type: String },
          total_sources: { type: Number, required: true },
          checkedAt: { type: Date, default: Date.now },
      }
  ]
});

const VirusTotalCheck = mongoose.model("VirusTotalCheck", virusTotalCheckSchema);

const deletionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  notes: { type: String },
  email: { type: String },         // Optional – only exists for sites needing an email
  email_subject: { type: String },   // Optional
  email_body: { type: String },      // Optional template for email
  domains: { type: [String], required: true }
});

const DeletionGuide = mongoose.model('DeletionGuide', deletionSchema);

const ratingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  domain: { type: String, required: true },
  rating: { type: Number, required: true } // Example: Risk level (0-100)
}, { timestamps: true });

const Rating = mongoose.model("Rating", ratingSchema);

app.get("/get-name/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }).select("name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ name: user.name, email: user.email });
  } catch (error) {
    console.error("Error fetching name:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/update-name", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: "Email and name are required" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { name },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Name updated successfully", name: user.name });
  } catch (error) {
    console.error("Error updating name:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



app.post("/check-virustotal", async (req, res) => {
  try {
      const { userEmail, domain, virusTotalResult } = req.body;

      if (!userEmail || !domain || !virusTotalResult) {
          return res.status(400).json({ error: "Missing required fields" });
      }

      // console.log("📩 Received VirusTotal check data:", req.body);

      // Find or create a VirusTotalCheck entry for the user
      let userCheck = await VirusTotalCheck.findOne({ user: userEmail });

      const newCheck = {
          domain: domain,
          malicious: virusTotalResult.malicious,
          source: virusTotalResult.source,
          total_sources: virusTotalResult.total_sources,
          checkedAt: new Date(),
      };

      if (!userCheck) {
          // If user doesn't exist, create a new document
          userCheck = new VirusTotalCheck({ user: userEmail, checks: [newCheck] });
      } else {
          // Append new check to the existing array
          userCheck.checks.push(newCheck);
      }

      await userCheck.save();

      res.json({ message: "VirusTotal check saved successfully" });
  } catch (error) {
      console.error("❌ Error saving VirusTotal check:", error);
      res.status(500).json({ error: "Server error" });
  }
});


// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP via Email
const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
    user: '',
    pass: ''
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It is valid for 15 minutes.`,
  });
};


// Request OTP endpoint
app.post("/request-otp", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    const user = await User.findOneAndUpdate(
      { email },
      { otp, otpExpires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOTPEmail(email, otp);
    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Request OTP error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to process OTP request"
    });
  }
});

// Verify OTP endpoint
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
    
    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to verify OTP" 
    });
  }
});

const GEMINI_API_KEY = "";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp-01-21' });

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

function sanitizeInput(text) {
  return text.replace(/<[^>]*>/g, '').substring(0, 8192);
}

app.post('/analyze-text', async (req, res) => {
  try {
    const { inputValue } = req.body;
    if (!inputValue) {
      return res.status(400).json({ error: 'No input provided' });
    }

    const sanitizedInput = sanitizeInput(inputValue);
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
  history: [
        {
          role: 'user',
          parts: [{ text: 'Analyze scam attempts. First explain your reasoning (under 5 points), then provide confidence percentage (0-100%) representing SCAM LIKELIHOOD in format "Confidence: X%"' }],
        },
        {
          role: 'model',
          parts: [{ text: 'I will analyze messages for scam indicators like urgency, suspicious links, and impersonation attempts. I will provide brief analysis followed by a confidence percentage.' }],
        },
      ],
      
    });

    const result = await chatSession.sendMessage(sanitizedInput);
    let responseText = result.response.text();
    
    // Remove any remaining formatting characters
    responseText = responseText.replace(/[*_]+/g, '');
    
    // Extract confidence percentage
    const confidenceMatch = responseText.match(/Confidence: (\d+)%/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 0;
    
    // Remove confidence statement from message
    const message = responseText.replace(/Confidence: \d+%/, '').trim();

    res.json({ message, confidence });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Error processing your request',
      details: error.message
    });
  }
});

const sessions = {}; // Temporary in-memory session storage

// Save session in memory and set cookie
app.post("/save-session", async (req, res) => {
  const { email, token, fingerprint } = req.body;
  if (!email || !token || !fingerprint) {
    return res.status(400).json({ error: "Email, token, and fingerprint are required" });
  }
  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, sessions: [] });
    }
    user.sessions.push({ token, fingerprint });
    await user.save();

    // Store session in the server-side in-memory object
    sessions[email] = { token, fingerprint };

    // Set a cookie (optional, for client-side access)
    res.cookie("session", JSON.stringify({ email, token, fingerprint }), {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day expiry
    });

    res.json({ message: "Session saved successfully on server!" });
  } catch (error) {
    console.error("Save-session error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Example endpoint that sends session data along with the response
app.get("/get-session-data", (req, res) => {
  const email = req.query.email;
  if (sessions[email]) {
    res.json({ session: sessions[email] });
  } else {
    res.status(404).json({ error: "No session found for this email." });
  }
});


// Remove-session endpoint: remove a session by fingerprint for a user
app.post("/remove-session", async (req, res) => {
  const { email, fingerprint } = req.body;
  if (!email || !fingerprint) {
    return res.status(400).json({ error: "Email and fingerprint are required" });
  }
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Ensure sessions array exists; if not, there's nothing to remove.
    if (!user.sessions || !Array.isArray(user.sessions) || user.sessions.length === 0) {
      return res.status(404).json({ error: "No sessions found for this user" });
    }
    const originalLength = user.sessions.length;
    user.sessions = user.sessions.filter(session => session.fingerprint !== fingerprint);
    await user.save();
    if (user.sessions.length < originalLength) {
      localStorage.removeItem("userSession");
      res.json({ success: true, message: "Session removed successfully" });
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  } catch (error) {
    console.error("Remove-session error:", error);
    res.status(500).json({ error: error.message });
  }
});


// Check-session endpoint: verify if a session exists for the provided fingerprint
app.post("/check-session", async (req, res) => {
  const { fingerprint } = req.body;
  if (!fingerprint) {
    return res.status(400).json({ error: "Fingerprint is required" });
  }
  try {
    // Find a user whose sessions array contains a session with this fingerprint
    const user = await User.findOne({ "sessions.fingerprint": fingerprint });
    if (user) {
      // Get the specific session
      const session = user.sessions.find((s) => s.fingerprint === fingerprint);
      if (session) {
        return res.json({
          sessionFound: true,
          token: session.token,
          email: user.email,
        });
      }
    }
    res.json({ sessionFound: false });
  } catch (error) {
    console.error("Check-session error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/store-breach", async (req, res) => {
  try {
      const { storedEmail, breachEmail } = req.body;

      // 🔹 Validate request
      if (!storedEmail || !breachEmail) {
          console.log("❌ Missing required fields in request:", req.body);
          return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      // console.log(`🔹 Received breach check request for: ${breachEmail}`);

      // 🔹 Fetch breach data from XposedOrNot API
      // console.log(`🔍 Fetching breach data for ${breachEmail} from XON API...`);
      const xonResponse = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(breachEmail)}`);
      const xonData = await xonResponse.json();
      // console.log(`📥 XON API Response:`, JSON.stringify(xonData, null, 2));

      // 🔹 Extract breaches
      if (!xonData.ExposedBreaches || !xonData.ExposedBreaches.breaches_details || xonData.ExposedBreaches.breaches_details.length === 0) {
          // console.log(`✅ No breaches found for: ${breachEmail}`);
          return res.json({ success: true, message: "No breaches found", breaches: [] });
      }

      const breaches = xonData.ExposedBreaches.breaches_details.map(breach => ({
          breachedSite: breach.breach,
          domain: breach.domain,
          industry: breach.industry,
          leakedData: breach.xposed_data?.split(";") || [],
          breachDate: breach.xposed_date,
          breachRecords: breach.xposed_records,
          passwordRisk: breach.password_risk,
          verified: breach.verified === "Yes",
          references: breach.references,
      }));

      // console.log(`📌 Extracted breaches: ${JSON.stringify(breaches, null, 2)}`);

      // 🔹 Find user in MongoDB
      let user = await User.findOne({ email: storedEmail });
      if (!user) {
          console.log(`❌ User not found for email: ${storedEmail}`);
          return res.status(404).json({ success: false, message: "User not found" });
      }

      // 🔹 Check if breaches already exist in MongoDB
      const existingBreaches = await Breach.find({ user: user._id, email: breachEmail });
      const newBreaches = breaches.filter(breach =>
          !existingBreaches.some(existing => existing.breachedSite === breach.breachedSite)
      );

      if (newBreaches.length === 0) {
          console.log(`✅ No new breaches to add for: ${breachEmail}`);
          return res.json({ success: true, message: "No new breaches to add", breaches: [] });
      }

      // console.log(`📌 New breaches to store: ${JSON.stringify(newBreaches, null, 2)}`);

      // 🔹 Save new breaches to MongoDB
      const savedBreaches = await Breach.insertMany(newBreaches.map(breach => ({
          user: user._id,
          email: breachEmail,
          ...breach
      })));

      // console.log(`✅ Successfully saved ${savedBreaches.length} new breaches for ${breachEmail}`);

      // 🔹 Update user breach list
      user.breaches.push(...savedBreaches.map(b => b._id));
      await user.save();

      res.json({ success: true, message: "Breach stored", breaches: savedBreaches });

  } catch (error) {
      console.error("❌ Server error:", error);
      res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/check-password-breach", async (req, res) => {
  try {
      const { password } = req.body;
      if (!password) {
          return res.status(400).json({ error: "Password is required." });
      }

      // Hash the password using Keccak-512
      const fullHash = keccak_512(password);
      const hashedPassword = fullHash.slice(0, 10); // First 10 chars

      // console.log("Full Keccak-512 Hash:", fullHash);
      // console.log("First 10 characters for API:", hashedPassword);

      // Call the ExposedOrNot API
      const apiUrl = `https://passwords.xposedornot.com/api/v1/pass/anon/${hashedPassword}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      // Extract breach details
      const breachCount = data.SearchPassAnon?.count || 0;
      const wordlistFlag = data.SearchPassAnon?.wordlist || 0;

      // Manually calculate character breakdown
      let digitCount = 0, upperCount = 0, lowerCount = 0, specialCount = 0;
      
      for (let char of password) {
          if (/[0-9]/.test(char)) digitCount++;
          else if (/[A-Z]/.test(char)) upperCount++;
          else if (/[a-z]/.test(char)) lowerCount++;
          else specialCount++;
      }

      const charDetails = `D:${digitCount};U:${upperCount};L:${lowerCount};S:${specialCount};T:${password.length}`;

      res.json({ breachCount, wordlistFlag, charDetails });
  } catch (error) {
      console.error("Error checking password breach:", error);
      res.status(500).json({ error: "Internal server error." });
  }
});

// Endpoint to get all deletion guides
app.get('/sites', async (req, res) => {
  try {
    const sites = await DeletionGuide.find();
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});




function sanitizeInput(text) {
  return text.replace(/<[^>]*>/g, '').substring(0, 8192);
}




app.post("/store-password-check", async (req, res) => {
  try {
    // console.log("Received request to store password check:", req.body);
    const { email, domain, passwordStrength } = req.body;
    const rating = passwordStrength; // Assuming this is a number between 0-100
    if (!email || !domain || rating === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if a rating already exists for the given domain
    let existingRating = await Rating.findOne({ user: user._id, domain });

    if (existingRating) {
      // Update the rating
      existingRating.rating = rating;
      await existingRating.save();
      return res.json({ message: "Rating updated successfully", rating: existingRating });
    } else {
      // Create a new rating entry
      const newRating = new Rating({
        user: user._id,
        domain,
        rating
      });
      await newRating.save();
      return res.json({ message: "New rating added", rating: newRating });
    }
  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const RAPI_KEY = "";
const TEMP_MAIL_API = "https://temp-mail44.p.rapidapi.com/api/v3/email/new";

app.post("/generate-email", async (req, res) => {
  console.log("Received request to generate email:", req.body);
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    let user = await User.findOne({ email });
    const now = new Date();
    
    if (user && user.tempMail && (now - new Date(user.tempMail.createdAt)) < 10 * 60 * 1000) {
      return res.json({ tempMail: user.tempMail.address });
    }

    const response = await axios.post(
      TEMP_MAIL_API,
      {},
      {
        headers: {
          "x-rapidapi-key": RAPI_KEY,
          "x-rapidapi-host": "temp-mail44.p.rapidapi.com",
          "Content-Type": "application/json",
        },
      }
    );

    const newTempMail = response.data.email;
    
    if (!user) {
      user = new User({ email, tempMail: { address: newTempMail, createdAt: now } });
    } else {
      user.tempMail = { address: newTempMail, createdAt: now };
    }

    await user.save();
    console.log("Generated temporary email:", newTempMail);
    return res.json({ tempMail: newTempMail });

  } catch (error) {
    console.error("Error generating email:", error);
    res.status(500).json({ error: "Failed to generate temporary email" });
  }
});

// Helper: Get User ID by Email
const getUserIdByEmail = async (email) => {
  const user = await User.findOne({ email });
  return user ? user._id : null;
};

// ----- Endpoint: Calculate Breach Score -----
app.get("/api/breach-score/:email", async (req, res) => { 
  try {
    const { email } = req.params;
    const userId = await getUserIdByEmail(email);
    if (!userId) return res.status(404).json({ error: "User not found" });

    const breaches = await Breach.find({ user: userId });
    let score = 100;
    const leakedDataSet = new Set(); // Tracks unique leaked data across ALL breaches

    let totalBreaches = breaches.length;
    let totalRecentBreaches = 0; 

    breaches.forEach(breach => {
      const breachYear = parseInt(breach.breachDate);
      const yearsOld = new Date().getFullYear() - breachYear;

      // Track all leaked data types
      breach.leakedData.forEach(dataType => leakedDataSet.add(dataType.toLowerCase()));

      // Track if breach is recent
      if (yearsOld < 1) totalRecentBreaches++;
    });

    // Deduct based on leaked data
    if (leakedDataSet.has("passwords")) score -= 20;
    if (leakedDataSet.has("email addresses")) score -= 10;
    if (leakedDataSet.has("phone numbers")) score -= 5;
    if (leakedDataSet.has("physical addresses") || leakedDataSet.has("geographic locations")) score -= 5;
    if (leakedDataSet.has("ip addresses")) score -= 3;
    if (leakedDataSet.has("names")) score -= 2;
    if (leakedDataSet.has("dates of birth")) score -= 4;
    if (leakedDataSet.has("spoken languages")) score -= 1;

    // Deduct based on breach count
    if (totalBreaches > 1) score -= Math.min(10, totalBreaches * 2); // Max -10 for multiple breaches

    // Deduct for recent breaches (higher impact)
    if (totalRecentBreaches > 0) score -= 15;

    score = Math.max(0, score); // Prevent negative scores

  
    res.json({ score });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ----- Endpoint: Calculate Website Safety Score -----
app.get("/api/website-safety-score/:email", async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[INFO] Checking website safety score for: ${email}`);

    const userId = await getUserIdByEmail(email);
    console.log(`[DEBUG] Retrieved User ID: ${userId}`);

    if (!userId) {
      console.log(`[WARN] User not found: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }

    // Try fetching by userId (ObjectId) OR by email (string)
    const checkData = await VirusTotalCheck.findOne({ 
      $or: [{ user: userId }, { user: email }]
    });

    console.log(`[DEBUG] Retrieved VirusTotalCheck for user:`, JSON.stringify(checkData, null, 2));

    let score = 100;

    if (checkData && checkData.checks && checkData.checks.length) {
      console.log(`[INFO] Total checks found: ${checkData.checks.length}`);

      const validChecks = checkData.checks.filter(c => c.total_sources > 0);
      console.log(`[DEBUG] Valid checks after filtering:`, JSON.stringify(validChecks, null, 2));

      const maliciousCount = validChecks.filter(c => c.malicious).length;
      console.log(`[INFO] Malicious domains count: ${maliciousCount}`);

      const totalSources = validChecks.reduce((sum, c) => sum + c.total_sources, 0);
      console.log(`[INFO] Total sources considered: ${totalSources}`);

      const totalChecks = validChecks.length;
      if (totalChecks > 0) {
        const maliciousImpact = (maliciousCount * 100) / totalChecks;
        console.log(`[INFO] Malicious impact on score: ${maliciousImpact.toFixed(2)}`);
        score = Math.max(0, 100 - maliciousImpact);
      }      
    } else {
      console.log(`[INFO] No valid VirusTotal data found for ${email}, keeping default score.`);
    }

    console.log(`[INFO] Final calculated website safety score: ${score}`);

    

    res.json({ score });
  } catch (err) {
    console.error(`[ERROR] ${err.message}`, err);
    res.status(500).json({ error: "Server error" });
  }
});


// ----- Endpoint: Calculate Password Strength Score -----
app.get("/api/password-score/:email", async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[INFO] Received request for password score: ${email}`);

    const userId = await getUserIdByEmail(email);
    if (!userId) {
      console.log(`[ERROR] User not found for email: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`[DEBUG] Retrieved User ID: ${userId}`);

    // Fetch all password-related ratings except breach, website, and overall
    const ratings = await Rating.find({ 
      user: userId, 
      domain: { $nin: ["breach", "website", "overall"] }
    });

    console.log(`[DEBUG] Fetched ratings:`, ratings);

    let score = 100;
    if (ratings.length) {
      let totalScore = 0;
      let totalRatings = ratings.length;

      ratings.forEach(r => {
        console.log(`[DEBUG] Processing rating -> Domain: ${r.domain}, Rating: ${r.rating}`);
        totalScore += (r.rating * 10); // Scale rating from 0-10 → 0-100
      });

      score = totalScore / totalRatings; // Get the average
    }

    score = Math.max(0, Math.min(100, score)); // Ensure within range

    console.log(`[INFO] Final password safety score: ${score}`);

    res.json({ score });
  } catch (err) {
    console.error(`[ERROR] Server error: ${err.message}`);
    res.status(500).json({ error: "Server error" });
  }
});



// ----- Endpoint: Calculate Overall Security Score -----
async function getBreachScore(email) {
  const response = await axios.get(`http://localhost:5000/api/breach-score/${email}`);
  return response.data.score || 100;
}

async function getWebsiteScore(email) {
  const response = await axios.get(`http://localhost:5000/api/website-safety-score/${email}`);
  return response.data.score || 100;
}

async function getPasswordScore(email) {
  const response = await axios.get(`http://localhost:5000/api/password-score/${email}`);
  return response.data.score || 100;
}

app.get("/api/overall-score/:email", async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[INFO] Received request for overall score: ${email}`);

    const userId = await getUserIdByEmail(email);
    if (!userId) {
      console.log(`[ERROR] User not found: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`[DEBUG] Retrieved User ID: ${userId}`);

    // Fetch scores safely
    const [breachScore, websiteScore, passwordScore] = await Promise.all([
      getBreachScore(email).catch(err => {
        console.error("[ERROR] Failed to fetch breach score:", err);
        return 100;
      }),
      getWebsiteScore(email).catch(err => {
        console.error("[ERROR] Failed to fetch website score:", err);
        return 100;
      }),
      getPasswordScore(email).catch(err => {
        console.error("[ERROR] Failed to fetch password score:", err);
        return 100;
      })
    ]);

    console.log(`[DEBUG] Scores -> Breach: ${breachScore}, Website: ${websiteScore}, Password: ${passwordScore}`);

    const overall = (breachScore * 0.4) + (websiteScore * 0.3) + (passwordScore * 0.3);

    console.log(`[INFO] Final overall score: ${Math.round(overall)}`);
    
    res.json({ score: Math.round(overall) });
  } catch (err) {
    console.error("[FATAL ERROR] Unexpected server crash:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/temp-mail/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    if (!user || !user.tempMail) {
      return res.status(404).json({ message: "Temp mail not found" });
    }

    const createdAt = new Date(user.tempMail.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 min expiry
    const expired = new Date() > expiresAt;

    res.json({
      email,
      tempMail: user.tempMail.address,
      expiresAt,
      expired,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/breach-info/:email", async (req, res) => {
  try {
      const { email } = req.params;
      
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      // Fetch breach details using user's _id
      const breachInfoList = await Breach.find({ user: user._id });
      if (!breachInfoList || breachInfoList.length === 0) {
          return res.status(404).json({ message: "No breach data found for this user" });
      }
      res.json(breachInfoList.map(info => ({
        userEmail: info.email,
        breachedSite: info.breachedSite,
        leakedData: info.leakedData,
        breachDate: info.breachDate,
    })));
  } catch (error) {
      console.error("Error fetching breach info:", error);
      res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/malicious-sites/:email", async (req, res) => {
  try {
    const { email } = req.params;

    // Find user's malicious checks by email
    const userCheck = await VirusTotalCheck.findOne({ user: email });

    if (!userCheck) {
      return res.status(404).json({ message: "No records found for this email." });
    }

    // Filter only malicious entries
    const maliciousSites = userCheck.checks
      .filter((check) => check.malicious === true)
      .map(({ domain, source, total_sources, checkedAt }) => ({
        domain,
        source,
        total_sources,
        checkedAt,
      }));

    if (maliciousSites.length === 0) {
      return res.json({ message: "No malicious sites found for this email." });
    }

    res.json({ email, maliciousSites });

  } catch (error) {
    console.error("Error fetching malicious sites:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/password-ratings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    // Get userId by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Get domain ratings for the user
    const domainRatings = await Rating.find({ user: user._id }).select("domain rating updatedAt");

    if (domainRatings.length === 0) {
      return res.json({ message: "No domain ratings found for this user." });
    }

    res.json({ email, domainRatings });

  } catch (error) {
    console.error("Error fetching domain ratings:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post('/generate-mail', async (req, res) => {
  try {
    // Expecting siteId and an optional inputValue (extra details) from the frontend
    const { siteId, inputValue } = req.body;
    if (!siteId) {
      return res.status(400).json({ error: 'No site provided' });
    }
    // Fetch the site document from MongoDB
    const site = await DeletionGuide.findById(siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }
    if (!site.email) {
      return res.status(400).json({ error: 'This site does not support email deletion' });
    }
    
    // Use the stored email_body template if provided, otherwise use a default template.
    const template = site.email_body || `I would like to request deletion of my account on ${site.name}. Please remove all my data from your system.`;
    
    // Build a prompt that incorporates the template and any extra details provided
    let prompt = `Generate a polite and professional email for account deletion for ${site.name}. Use the following details as a base: ${template}`;
    if (inputValue) {
      prompt += ` Additional details: ${inputValue}`;
    }
    
    // Create a chat session with Gemini API and send the prompt
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
      history: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });
    
    const result = await chatSession.sendMessage(sanitizeInput(prompt));
    const generatedEmail = result.response.text().trim();

    res.json({
      email: site.email,
      generatedEmail,
    });
  } catch (error) {
    console.error('Error in /generate-email:', error);
    res.status(500).json({ error: 'Error processing your request' });
  }
});


// Start Server
app.listen(5000, () => console.log("Server running on port 5000"));
