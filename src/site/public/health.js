const healthdiv = document.getElementById("health");

function healthCheck() {
  if (healthdiv) {
    fetch("/health")
      .then((response) => response.json())
      .then((data) => {
        healthdiv.classList.remove("checking");
        if (data.status === "ok") {
          healthdiv.classList.remove("offline");
          healthdiv.classList.add("online");
          // convert uptime to human readable text
          const uptime = Math.floor(data.uptime);
          const days = Math.floor(uptime / 86400);
          const hours = Math.floor((uptime % 86400) / 3600);
          const minutes = Math.floor((uptime % 3600) / 60);
          const seconds = uptime % 60;

          healthdiv.textContent = `Online for ${days}d ${hours}h ${minutes}m ${seconds}s`;
        } else {
          healthdiv.classList.remove("online");
          healthdiv.classList.add("offline");
          healthdiv.textContent = "Offline";
        }
      })
      .catch((error) => {
        healthdiv.classList.remove("online", "checking");
        healthdiv.classList.add("offline");
        console.error("Error fetching health status:", error);
        healthdiv.textContent = "Offline";
      });
  } else {
    console.error("Health div not found in the document.");
  }
}

healthCheck();
setTimeout(() => {
  healthCheck();
}, (timeout = 5000)); // update health status every 5 seconds
