document.addEventListener("DOMContentLoaded", function () {
  console.log("email.js loaded");

  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");
  console.log("Extracted email:", email);

  if (email) {
      document.getElementById("email").value = email;
  }

  document.getElementById("forwardBtn").addEventListener("click", function () {
      const emailInput = document.getElementById("email").value;
      console.log("Forwarding email:", emailInput);
      if (emailInput) {
          window.location.href = `https://extension-frontend.vercel.app/popemail?email=${encodeURIComponent(emailInput)}`;
      } else {
          alert("Please enter a valid email address");
      }
  });
});
