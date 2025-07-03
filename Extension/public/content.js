document.addEventListener("DOMContentLoaded", () => {
  console.log("jsQR is loaded:", typeof jsQR === "function"); // Debug check
});

// Listen for input events on email and password fields
document.addEventListener("input", async (event) => {
    const target = event.target;
    
    if (!target || (target.type !== "password" && target.type !== "email")) return;

    chrome.storage.local.get(["liveEmail", "livePassword", "email"], async (settings) => {
        if (!settings) return;

        if (target.type === "email" && settings.liveEmail) {
            checkEmailBreach(target.value);
        }

        if (target.type === "password" && settings.livePassword) {
            const passwordStrength = checkPasswordStrength(target.value);
            sendPasswordData(target.value, passwordStrength);
        }
    });
});

// Function to send data to the backend
const sendPasswordData = (password, strength) => {
    chrome.storage.local.get("email", (data) => {
        // Use data.email instead of data.storedEmail
        const email = data.email || "Unknown";
        const domain = window.location.hostname;

        fetch("https://integral-addia-shivdwivedi-f1a17698.koyeb.app/store-password-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, domain, passwordStrength: strength }),
        })
        .then(response => response.json())
        .then(data => console.log("✅ Sent to backend:", data))
        .catch(error => console.error("❌ Error sending data:", error));
    });
};


// ✅ Check email breaches using ExposedOrNot API via background script
let emailTimeout;

const checkEmailBreach = (email) => {
    // Only proceed if the email looks complete
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
        console.log("⏳ Waiting for full email input...");
        return; // Do nothing if the email is incomplete
    }

    // Clear previous timeout to prevent multiple requests
    clearTimeout(emailTimeout);

    // Debounce: Wait 800ms after typing stops
    emailTimeout = setTimeout(() => {
        console.log("🔍 Checking email breach for:", email);
        chrome.runtime.sendMessage(
          { action: "checkEmailBreach", email },
          (response) => {
              if (response.breached) {
                  const breachNames = response.breaches.map(breach => {
                      const breachData = Array.isArray(breach) ? breach[0] : breach;
                      return breachData && typeof breachData === 'object' ? breachData.Name || breachData.name || "Unknown Breach" : breachData || "Unknown Breach";
                  }).join(", ");
                  showNotification(`⚠️ Breached in: ${breachNames}`, "red", response.inputType, response.inputValue);
              } else {
                  showNotification("✅ Email is safe!", "green", response.inputType, response.inputValue);
              }
          }
        );
    }, 1000); // Adjust debounce time if needed
};



const checkPasswordStrength = (password) => {
    // Common passwords (truncated list for brevity)
const commonPasswords = [
    'password', 
    '123456', 
    '1234567', 
    '12345678', 
    '123456789', 
    'qwerty', 
    'abc123', 
    'letmein', 
    'admin', 
    'welcome', 
    'password1', 
    '123123', 
    '1234567890', 
    'qwerty123', 
    '111111', 
    '1234', 
    '12345', 
    'dragon', 
    'baseball', 
    'football', 
    'monkey', 
    'shadow', 
    'master', 
    '666666', 
    '7777777', 
    'sunshine', 
    'princess', 
    'login', 
    'passw0rd', 
    'admin123', 
    'solo', 
    'starwars', 
    'whatever', 
    'trustno1', 
    'iloveyou', 
    'adobe123', 
    'photoshop', 
    'azerty', 
    '000000', 
    'qazwsx'
];

    // Reject extremely common passwords
    if (commonPasswords.includes(password.toLowerCase())) {
        showNotification("❌ Very Weak - This password is too common!", "red", "password", password);
        return 1; 
    }

    let strength = 0;
    const length = password.length;

    // ✅ Adjusted Length Scoring
    if (length >= 14) strength += 3;  
    else if (length >= 12) strength += 2;
    else if (length >= 8) strength += 1;  
    else {
       showNotification("❌ Too short! Minimum 8 characters recommended.", "red", "password", password);
        if (length >= 6 )return 0.3;
        else{
            return 0;
        }
    }

    // ✅ Character variety
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    
    [hasUpper, hasLower, hasNumber, hasSymbol].forEach(flag => {
        if (flag) strength += 1;
    });

    // ✅ Entropy Calculation
    const charsetSize = calculateCharsetSize(password);
    const entropy = Math.log2(charsetSize) * length;

    // ✅ Relaxed Entropy Scoring
    if (entropy > 75) strength += 2;  
    else if (entropy > 55) strength += 1;  

    // ✅ Reduced Penalty for Patterns
    if (hasConsecutiveChars(password)) strength -= 1;
    if (hasRepeatedChars(password)) strength -= 1;
    if (hasKeyboardPattern(password)) strength -= 2;

    // ✅ Rebalanced Strength Levels
    const strengthLevels = [
        { threshold: 5, message: "⚠️ Weak - Consider improving", color: "orange" }, 
        { threshold: 7, message: "🟡 Moderate - Decent security", color: "darkyellow" },
        { threshold: 8, message: "🟢 Strong - Secure for daily use", color: "green" },
        { threshold: 9,message: "✅ Excellent - Very high security", color: "darkgreen" }
    ];

    const result = strengthLevels.find((level, index) => 
        strength < level.threshold || index === strengthLevels.length - 1
    );
    console.log("Password Strength Score:", strength);

    showNotification(result.message, result.color, "password", password);
    return strength;
};

// ✅ Helper functions
const calculateCharsetSize = (password) => {
    let charset = 0;
    if (/[a-z]/.test(password)) charset += 26;
    if (/[A-Z]/.test(password)) charset += 26;
    if (/[0-9]/.test(password)) charset += 10;
    if (/[^A-Za-z0-9]/.test(password)) charset += 32;
    return charset || 1;
};

const hasRepeatedChars = (password) => /(.)\1{3,}/.test(password); // 4+ repeated chars  
const hasConsecutiveChars = (password) => /(012|123|234|345|456|567|678|789)/.test(password);  
const hasKeyboardPattern = (password) => ["qwerty", "asdf", "zxcv", "1qaz"].some(p => password.toLowerCase().includes(p));  

// ✅ Show UI notification for both email and password with redirection
const showNotification = (message, color, inputType, inputValue) => {
    console.log("Notification Message:", message, "Color:", color); // Debugging

    let notification = document.getElementById("extension-notification");
    if (!notification) {
        notification = document.createElement("div");
        notification.id = "extension-notification";
        document.body.appendChild(notification);
    }

    // Apply styles dynamically
    Object.assign(notification.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        padding: "12px 18px",
        borderRadius: "6px",
        backgroundColor: color || "gray", // Default color if undefined
        color: "#fff",
        fontSize: "14px",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
        cursor: "pointer",
        zIndex: "99999",
        transition: "opacity 0.5s ease",
        opacity: "1",
        visibility: "visible",
        display: "block",
    });

    notification.innerHTML = message;

    notification.onclick = () => {
        const url = `https://extension-frontend.vercel.app/breach-result?inputType=${encodeURIComponent(inputType)}&inputValue=${encodeURIComponent(inputValue)}`;
        window.open(url, "_blank");
    };

    setTimeout(() => {
        console.log("Hiding Notification..."); // Debugging
        notification.style.opacity = "0";
        setTimeout(() => {
            notification.style.display = "none"; // Properly hide after fade-out
        }, 500);
    }, 5000);
};

// Check if livePassword is enabled before adding the event listener
chrome.storage.local.get(["livePassword"], (settings) => {
    if (settings.livePassword) {
        document.addEventListener("keydown", async (event) => {
            const activeElement = document.activeElement;
            
            // Ensure Shift is pressed in a password field
            if (event.key === "Tab" && activeElement && activeElement.type === "password") {
                const password = activeElement.value;
                if (!password) return;

                // console.log("🚀 Shift key pressed! Checking password breach for:", password);

                try {
                    const response = await fetch("https://integral-addia-shivdwivedi-f1a17698.koyeb.app/check-password-breach", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ password }),
                    });

                    const data = await response.json();
                    const breachCount = data.breachCount || 0;

                    let message, color;
                    if (breachCount > 0) {
                        message = `⚠️ Password found in ${breachCount} breaches!`;
                        color = "red"; // High risk
                    } else {
                        message = "✅ Password not found in breaches.";
                        color = "green"; // Safe
                    }

                    showBreachNotification(message, color, 5000);
                } catch (error) {
                    console.error("❌ Error checking password breach:", error);
                }
            }
        });
    }
});

// ✅ Function to show breach notification
const showBreachNotification = (message, color, timeout = 5000) => {
    let breachNotification = document.getElementById("breach-notification");
    
    if (!breachNotification) {
        breachNotification = document.createElement("div");
        breachNotification.id = "breach-notification";
        breachNotification.style.position = "fixed";
        breachNotification.style.bottom = "20px";
        breachNotification.style.right = "20px";
        breachNotification.style.padding = "10px 15px";
        breachNotification.style.borderRadius = "5px";
        breachNotification.style.backgroundColor = color;
        breachNotification.style.color = "white";
        breachNotification.style.zIndex = "9999";
        document.body.appendChild(breachNotification);
    } else {
        breachNotification.style.backgroundColor = color;
    }

    breachNotification.innerText = message;
    breachNotification.style.display = "block";

    setTimeout(() => {
        breachNotification.style.display = "none";
    }, timeout);
};



// Function to get settings from storage
const getSettings = () => {
    return new Promise((resolve) => {
        chrome.storage.local.get(["liveQRCheck"], (result) => {
            resolve(result.liveQRCheck ?? false);
        });
    });
};

// Function to analyze QR purpose
const analyzeQRPurpose = (url) => {
    if (!url) return "Unknown";

    if (url.startsWith("upi://") || url.includes("paytm") || url.includes("phonepe") || url.includes("paypal.me")) 
        return "Payment Link";

    if (url.includes("play.google.com/store/apps/details")) 
        return "Play Store Link";

    if (url.includes("youtube.com") || url.includes("youtu.be")) 
        return "YouTube Video";

    if (url.includes("instagram.com") || url.includes("twitter.com") || url.includes("facebook.com")) 
        return "Social Media Link";

    if (url.endsWith(".pdf")) 
        return "PDF File";

    if (/\.(apk|exe|zip|rar|dmg)$/i.test(url)) 
        return "Download Link";

    if (url.includes("drive.google.com")) 
        return "Google Drive File";

    if (url.startsWith("http")) 
        return "Website / Redirect Link";

    return "Unknown";
};


// Function to check the URL with VirusTotal
const checkQRWithVirusTotal = (url) => {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "checkVirusTotal", url }, (response) => {
            if (response && response.malicious) {
                resolve({ malicious: true, source: response.source });
            } else {
                resolve({ malicious: false });
            }
        });
    });
};


  

// ✅ Scan only when the toggle is ON
chrome.storage.onChanged.addListener((changes) => {
    if (changes.liveQRCheck) {
        console.log("🔄 QR Check setting changed. Rescanning images...");
        scanImagesForQR();
    }
});


const scannedImages = new Set();

const scanImageForQR = async (img) => {
    try {
        if (scannedImages.has(img.src)) return; // ✅ Skip already processed images

        const imageBlob = await fetchImageAsBlob(img.src);
        if (!imageBlob) return;
        
        const imageBitmap = await createImageBitmap(imageBlob);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        ctx.drawImage(imageBitmap, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, canvas.width, canvas.height);

        if (!qrCode) return;

        const qrText = qrCode.data;  // ✅ This is the extracted QR URL
        console.log(`✅ QR Detected: ${qrText}`);

        const result = await checkQRWithVirusTotal(qrText);  // Check QR with VirusTotal

        const isMalicious = result?.malicious;
        if (isMalicious) {
            message = `⚠️ Malicious QR Detected!`;
        } else {
            const purpose = analyzeQRPurpose(qrText);
            message = `✅ Safe QR Code\n🔍 Purpose: ${purpose}`;
        }

        showQRNotification(img, message, isMalicious ? "red" : "green");
        scannedImages.add(img.src);

    } catch (error) {
        console.error("❌ Error scanning QR:", error);
    }
};


// ✅ Convert cross-origin images into local data URLs
const fetchImageAsBlob = async (url) => {
    try {
        const response = await fetch(url, { mode: "no-cors" });
        return await response.blob();
    } catch (error) {
        console.error("❌ Cross-Origin Image Fetch Failed:", error);
        return null;
    }
};

// ✅ Show notification near QR
const showQRNotification = (img, message, color) => {
    const oldMessage = img.parentElement.querySelector(".qr-alert");
    if (oldMessage) oldMessage.remove();

    const alertBox = document.createElement("div");
    alertBox.className = "qr-alert";
    alertBox.innerText = message;
    alertBox.style.position = "absolute";
    alertBox.style.background = color;
    alertBox.style.color = "white";
    alertBox.style.padding = "5px 10px";
    alertBox.style.borderRadius = "5px";
    alertBox.style.fontSize = "12px";
    alertBox.style.fontWeight = "bold";
    alertBox.style.zIndex = "9999";
    alertBox.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";

    const imgRect = img.getBoundingClientRect();
    alertBox.style.top = `${imgRect.top + window.scrollY - 30}px`;
    alertBox.style.left = `${imgRect.left + window.scrollX}px`;

    document.body.appendChild(alertBox);
};

// ✅ Scan only new images, but keep old messages
const scanImagesForQR = async () => {
    const isEnabled = await getSettings();
    if (!isEnabled) {
        console.log("❌ QR scanning is OFF. Skipping scan.");
        return;
    }

    console.log("🔍 Scanning images for QR codes...");
    const images = document.querySelectorAll("img");
    images.forEach(scanImageForQR);
};

// ✅ Observe new images only (no re-scanning)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.tagName === "IMG") {
                scanImageForQR(node);
            }
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// ✅ Initial scan
setTimeout(scanImagesForQR, 1000);


chrome.runtime.sendMessage(
    { action: "checkVirusTotal", url: extractedQrUrl },
    (response) => {
      console.log("🛡 QR Scan Result:", response); // Log the response
      if (response && response.malicious) {
        alert(`🚨 Malicious QR Code Detected!\nSource: ${response.source}`);
      }
    }
  );
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "syncToken") {
      console.log("Syncing token to localStorage:", message.token);
      
      localStorage.setItem("authToken", message.token);
      localStorage.setItem("email", message.email);
  
      // Ensure website detects token update
      window.dispatchEvent(new Event("storage"));
    }
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data.type !== "GET_AUTH") return;
    
    console.log("[content.js] Received GET_AUTH request from website");
  
    chrome.runtime.sendMessage({ type: "GET_AUTH" }, (response) => {
      console.log("[content.js] Got response from background.js:", response);
  
      window.postMessage(
        { type: "AUTH_RESPONSE", email: response?.email, token: response?.token },
        "*"
      );
    });
  });
  
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target && target.type === "email") {
        checkEmailBreach(target.value);
    }
});

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.liveEmail || changes.livePassword) {
        console.log("Extension settings updated:", changes);
    }
  });
