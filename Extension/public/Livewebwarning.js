// ✅ Function to create the warning popup UI
function showWarningPopup(sources) {
    // Remove existing popup if already present
    const existingPopup = document.getElementById("malicious-warning-popup");
    if (existingPopup) existingPopup.remove();

    // ✅ Create the popup container
    const popup = document.createElement("div");
    popup.id = "malicious-warning-popup";
    popup.innerHTML = `
        <div class="warning-box">
            <h2>⚠️ Warning: Unsafe Website</h2>
            <p>This site has been flagged as unsafe by:</p>
            <ul>${sources.map(src => `<li>${src}</li>`).join("")}</ul>
            <button id="close-warning-btn">Close</button>
        </div>
    `;

    // ✅ Add styles
    popup.style.position = "fixed";
    popup.style.top = "20px";
    popup.style.right = "20px";
    popup.style.width = "300px";
    popup.style.background = "#d60000";
    popup.style.color = "white";
    popup.style.padding = "15px";
    popup.style.borderRadius = "10px";
    popup.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
    popup.style.zIndex = "9999";
    popup.style.fontFamily = "Arial, sans-serif";
    
    popup.querySelector(".warning-box").style.textAlign = "center";
    popup.querySelector("h2").style.marginBottom = "10px";
    popup.querySelector("ul").style.textAlign = "left";
    popup.querySelector("ul").style.paddingLeft = "20px";
    
    const button = popup.querySelector("#close-warning-btn");
    button.style.display = "block";
    button.style.margin = "10px auto 0";
    button.style.padding = "5px 10px";
    button.style.background = "white";
    button.style.color = "black";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    
    // ✅ Close button functionality
    button.onclick = () => popup.remove();

    // ✅ Add to the page
    document.body.appendChild(popup);
}

// ✅ Listen for messages from background.js
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "showWarning" && message.sources) {
        showWarningPopup(message.sources);
    }
});
