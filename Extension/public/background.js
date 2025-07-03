const GOOGLE_API_KEY = "GOOGLE_API_KEY";
const ABUSE_IP_DB_API_KEY = "ABUSE_IP_DB_API_KEY";
const VIRUSTOTAL_API_KEY = "VIRUSTOTAL_API_KEY";

// ------------------------
// Domain & Website Checks
// ------------------------

const extractDomain = (url) => {
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
};

const resolveDomainToIPs = async (domain) => {
    try {
        const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
        const data = await response.json();
        return data.Answer?.map(entry => entry.data) || [];
    } catch (error) {
        console.error(`❌ DNS resolution error: ${error}`);
        return [];
    }
};

const checkWithVirusTotal = async (domain) => {
    try {
        const response = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, {
            headers: { "x-apikey": VIRUSTOTAL_API_KEY },
        });
        const data = await response.json();
        const stats = data.data?.attributes?.last_analysis_stats || {};

        const result = {
            malicious: (stats.malicious || 0) + (stats.suspicious || 0) > 3,
            source: stats.malicious ? `VirusTotal (${stats.malicious} detections)` : null,
            total_sources: Object.keys(data.data?.attributes?.last_analysis_results || {}).length,
        };

        // Fetch email from Chrome storage and send data to backend
        chrome.storage.local.get(["email"], async (resultEmail) => {
            if (!resultEmail.email) return console.error("No user email found");

            await fetch("https://integral-addia-shivdwivedi-f1a17698.koyeb.app/check-virustotal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userEmail: resultEmail.email,
                    domain,
                    virusTotalResult: result
                }),
            });
        });

        return result;
    } catch (error) {
        console.error("❌ VirusTotal API Error:", error);
        return { malicious: false };
    }
};


const checkWithAbuseIPDB = async (ip) => {
    try {
        const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`, {
            headers: { "Key": ABUSE_IP_DB_API_KEY, "Accept": "application/json" },
        });
        const data = await response.json();
        return { 
            malicious: data.data?.abuseConfidenceScore >= 50,
            source: data.data?.abuseConfidenceScore ? `AbuseIPDB (${ip})` : null
        };
    } catch (error) {
        console.error("❌ AbuseIPDB API Error:", error);
        return { malicious: false };
    }
};

const checkWebsiteTrust = async (url) => {
    const domain = extractDomain(url) || [];
    const maliciousSources = [];
    
    const vtCheck = await checkWithVirusTotal(domain);
    if (vtCheck.malicious) maliciousSources.push(vtCheck.source);

    const ips = await resolveDomainToIPs(domain);
    for (const ip of ips) {
        const abuseCheck = await checkWithAbuseIPDB(ip);
        if (abuseCheck.malicious) maliciousSources.push(abuseCheck.source);
    }

    return maliciousSources.length > 0 
        ? { malicious: true, sources: maliciousSources } 
        : { malicious: false };
};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        chrome.storage.local.get(["liveWebsiteInspect"], async (result) => {
            if (!result.liveWebsiteInspect) return;

            const trustData = await checkWebsiteTrust(tab.url);
            if (trustData.malicious) {
                chrome.scripting.executeScript({
                    target: { tabId },
                    files: ["Livewebwarning.js"]
                }, () => {
                    chrome.tabs.sendMessage(tabId, {
                        action: "showWarning",
                        sources: trustData.sources
                    });
                });
            }
        });
    }
});

// ------------------------
// Email Breach Check
// ------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkEmailBreach") {
        chrome.storage.local.get(["liveEmail", "email"], (result) => {  // ✅ Get stored email
            if (!result.liveEmail) return sendResponse({
                breached: false,
                breaches: [],
                inputType: "email",
                inputValue: message.email
            });

            fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(message.email)}`)
                .then(response => response.json())
                .then(data => {
                    const breaches = data.breaches?.flat(2).filter(Boolean) || [];
                    const resultData = {
                        breached: breaches.length > 0,
                        breaches,
                        inputType: "email",
                        inputValue: message.email
                    };

                    chrome.action.setBadgeText({ text: "B!" });

                    if (!result.email) {
                        console.error("❌ No stored email found in Chrome storage.");
                        return sendResponse(resultData);
                    }

                    fetch("https://integral-addia-shivdwivedi-f1a17698.koyeb.app/store-breach", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            storedEmail: result.email,  // ✅ Fixed: sending stored email
                            breachEmail: message.email,
                        })
                    }).then(res => res.json())
                    .then(response => console.log("✅ Breach stored:", response))
                    .catch(err => console.error("❌ Failed to store breach:", err));

                    sendResponse(resultData);
                })
                .catch(error => sendResponse({ error: error.message }));
        });
        return true;
    }
});


// ------------------------
// QR Code Check
// ------------------------
const checkQRWithVirusTotal = async (url) => {
    try {
        const submitResponse = await fetch("https://www.virustotal.com/api/v3/urls", {
            method: "POST",
            headers: {
                "x-apikey": VIRUSTOTAL_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `url=${encodeURIComponent(url)}`
        });

        const submitData = await submitResponse.json();
        if (!submitData.data?.id) return { malicious: false };

        const reportResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${submitData.data.id}`, {
            headers: { "x-apikey": VIRUSTOTAL_API_KEY }
        });

        const reportData = await reportResponse.json();
        const stats = reportData.data?.attributes?.stats || {};
        return {
            malicious: (stats.malicious || 0) + (stats.suspicious || 0) > 3,
            source: stats.malicious ? `VirusTotal (${stats.malicious} detections)` : null
        };
    } catch (error) {
        console.error("❌ VirusTotal API Error:", error);
        return { malicious: false };
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkVirusTotal") {
        checkQRWithVirusTotal(message.url).then(sendResponse);
        return true;
    }
});

// ------------------------
// Local Email System
// ------------------------
async function getLocalEmail() {
    try {
        console.log("🔍 Retrieving user email from Chrome storage...");
        const storedData = await new Promise(resolve => {
            chrome.storage.local.get(["email"], result => resolve(result.email));
        });

        if (!storedData) {
            console.error("⚠ No user email found in storage.");
            return null;
        }

        console.log(`📨 Fetching temp email for: ${storedData}`);

        // Fetch temp email using the stored user email
        const response = await fetch('https://integral-addia-shivdwivedi-f1a17698.koyeb.app/generate-email', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: storedData })
        });

        const data = await response.json();
        if (!data.tempMail) throw new Error("No temp email received");
        chrome.storage.local.set({ tempEmail: data.tempMail });

        console.log(`✅ Temp email received: ${data.tempMail}`);
        return data.tempMail;
    } catch (error) {
        console.error("❌ Failed to fetch temp email:", error);
        return null;
    }
}

// ------------------------
// Fake Identity Autofill
// ------------------------
chrome.contextMenus.create({
    id: "fakeIdentityFill",
    title: "Fill with Fake Identity",
    contexts: ["editable"]
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "fakeIdentityFill",
            title: "Fill with Fake Identity",
            contexts: ["editable"]
        });
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "fakeIdentityFill") {
        try {
            console.log("🔄 Starting autofill process...");
            const localEmail = await getLocalEmail();
            if (!localEmail) {
                console.warn("⚠ No temp email available, skipping autofill.");
                return;
            }

            console.log(`📩 Using email: ${localEmail}`);
            const userData = await fetch("https://randomuser.me/api/").then(r => r.json());
            const user = userData.results[0];
            user.email = localEmail;

            console.log("⚡ Injecting autofill script...");
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: fillFormFields,
                args: [user]
            });

            // ✅ Show a notification ONLY when autofill is manually triggered
            console.log("🔔 Sending notification...");
            chrome.notifications.create("tempEmailFilled", {
                type: "basic",
                iconUrl: "icon.png",
                title: "Temp Email Used",
                message: `Your temp email: ${localEmail}`
            });

            console.log("🎉 Autofill completed & notification sent.");
        } catch (e) {
            console.error("🚨 Autofill error:", e);
        }
    }
});

// ✅ Handle Notification Click to Open Email Page
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log("📨 Notification clicked, opening temp email...");

    // Extract email from stored data or notification
    chrome.storage.local.get(["tempEmail"], function (result) {
        if (result.tempEmail) {
            const email = result.tempEmail;
            const targetUrl = `https://extension-frontend.vercel.app/popemail?email=${encodeURIComponent(email)}`;
            
            console.log("🌐 Opening URL:", targetUrl);
            
            // Open the URL in a new tab
            chrome.tabs.create({ url: targetUrl });
        } else {
            console.log("⚠️ No email found in storage!");
        }
    });
});


function fillFormFields(userData) {
    try {
      console.log("🖥️ Starting form fill...");
      let filledFields = 0;
  
      const nameFirst = userData.name.first || "";
      const nameLast = userData.name.last || "";
      const fullName = `${nameFirst} ${nameLast}`.trim();
      const middleName = ""; // randomuser doesn't provide this — optional
  
      const dob = new Date(userData.dob.date); // ISO date string
      const dobStr = dob.toISOString().split("T")[0]; // YYYY-MM-DD
  
      document.querySelectorAll("input, select, textarea").forEach(input => {
        const name = (input.name || input.id || "").toLowerCase();
  
        try {
          // Name Handling
          if (name.includes("first") && name.includes("name")) {
            input.value = nameFirst;
          } else if (name.includes("middle") && name.includes("name")) {
            input.value = middleName;
          } else if ((name.includes("last") || name.includes("surname")) && name.includes("name")) {
            input.value = nameLast;
          } else if (name === "fullname" || (name.includes("full") && name.includes("name"))) {
            input.value = fullName;
          } else if (name === "name" && !name.includes("user")) {
            input.value = fullName;
          }
  
          // Username
          if (name.includes("username")) {
            input.value = userData.login.username;
          }
  
          // Email
          if (name.includes("email")) {
            input.value = userData.email;
          }
  
          // Phone
          if (name.includes("phone") || name.includes("mobile")) {
            input.value = userData.phone;
          }
  
          // Address
          if (name.includes("address") || name.includes("street")) {
            input.value = `${userData.location.street.number} ${userData.location.street.name}`;
          }
  
          // City
          if (name.includes("city")) {
            input.value = userData.location.city;
          }
  
          // Zip / Postal Code
          if (name.includes("zip") || name.includes("postal")) {
            input.value = userData.location.postcode;
          }
  
          // DOB - Input or Select
          if (input.type === "date" && name.includes("birth")) {
            input.value = dobStr;
          }
  
          if (input.tagName === "SELECT" && name.includes("gender")) {
            const gender = userData.gender.toLowerCase();
            for (const opt of input.options) {
              if (opt.value.toLowerCase().includes(gender)) {
                input.value = opt.value;
                break;
              }
            }
          }
  
          input.dispatchEvent(new Event("input", { bubbles: true }));
          filledFields++;
  
        } catch (fieldError) {
          console.warn(`⚠️ Error autofilling field ${name}:`, fieldError);
        }
      });
  
      console.log(`✅ Autofill completed. Fields filled: ${filledFields}`);
      console.log("📧 Final email used:", userData.email);
  
    } catch (error) {
      console.error("🚨 Form fill error:", error);
    }
  }
  
// ------------------------
// Auth Management
// ------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "syncToken") {
        chrome.storage.local.set({
            securityEmail: message.email, 
            authToken: message.token
        }, () => sendResponse({ status: "success" }));
        return true;
    }

    if (message.type === "GET_AUTH") {
        chrome.storage.local.get(["securityEmail", "authToken"], sendResponse);
        return true;
    }
});

// ------------------------
// Initialization
// ------------------------
chrome.notifications.onClicked.addListener(notificationId => {
    if (["breachAlert"].includes(notificationId)) {
        chrome.tabs.create({ url: "email.html" });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.query({ url: "<all_urls>" }, (tabs) => {
        for (let tab of tabs) {
            if (tab.id) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["content.js"]
                }).catch(err => console.warn("Failed to inject script:", err));
            }
        }
    });
});


console.log("✅ Background service worker initialized.");

chrome.runtime.onSuspend.addListener(() => {
    console.log("🚨 Background script is unloading!");
});