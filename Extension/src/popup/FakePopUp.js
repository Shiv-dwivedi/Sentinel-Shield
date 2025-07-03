document.addEventListener("DOMContentLoaded", () => {
    const emailElement = document.getElementById("email");

    // Load temp email from storage
    chrome.storage.local.get(["tempEmail"], data => {
        if (data.tempEmail) {
            emailElement.textContent = data.tempEmail;
        } else {
            emailElement.textContent = "Generating...";
            chrome.runtime.sendMessage({ action: "fetchTempMail" });
        }
    });

    // Listen for email updates
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "updateEmail") {
            emailElement.textContent = message.email;
        }
    });

    document.getElementById("copyEmail").addEventListener("click", () => {
        navigator.clipboard.writeText(emailElement.textContent);
        alert("Copied!");
    });

    document.getElementById("refresh").addEventListener("click", () => {
        emailElement.textContent = "Generating...";
        chrome.runtime.sendMessage({ action: "fetchTempMail" });
    });
});
