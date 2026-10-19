document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.appendChild(title);

        const description = document.createElement("p");
        description.textContent = details.description;
        activityCard.appendChild(description);

        const schedule = document.createElement("p");
        const scheduleLabel = document.createElement("strong");
        scheduleLabel.textContent = "Schedule: ";
        schedule.append(scheduleLabel, details.schedule);
        activityCard.appendChild(schedule);

        const availability = document.createElement("p");
        const availabilityLabel = document.createElement("strong");
        availabilityLabel.textContent = "Availability: ";
        availability.append(availabilityLabel, `${spotsLeft} spots left`);
        activityCard.appendChild(availability);

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = `Participants (${details.participants.length})`;
        participantsSection.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";
        details.participants.forEach((participant) => {
          const participantItem = document.createElement("li");

          const participantEmail = document.createElement("span");
          participantEmail.className = "participant-email";
          participantEmail.textContent = participant;
          participantItem.appendChild(participantEmail);

          const removeButton = document.createElement("button");
          removeButton.className = "remove-participant";
          removeButton.type = "button";
          removeButton.textContent = "×";
          removeButton.dataset.email = participant;
          removeButton.setAttribute("aria-label", `Remove ${participant} from ${name}`);
          removeButton.title = `Remove ${participant} from ${name}`;
          participantItem.appendChild(removeButton);
          participantsList.appendChild(participantItem);
        });

        if (details.participants.length === 0) {
          const emptyItem = document.createElement("li");
          emptyItem.className = "empty-participants";
          emptyItem.textContent = "No participants yet.";
          participantsList.appendChild(emptyItem);
        }

        participantsList.addEventListener("click", async (event) => {
          const button = event.target.closest(".remove-participant");
          if (!button) return;

          button.disabled = true;
          try {
            const response = await fetch(
              `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(button.dataset.email)}`,
              { method: "DELETE" }
            );
            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.detail || "Could not remove participant.");
            }

            const participantIndex = details.participants.indexOf(button.dataset.email);
            if (participantIndex !== -1) details.participants.splice(participantIndex, 1);
            button.closest("li").remove();
            participantsHeading.textContent = `Participants (${details.participants.length})`;
            availability.replaceChildren(
              availabilityLabel,
              `${details.max_participants - details.participants.length} spots left`
            );

            if (details.participants.length === 0) {
              const emptyItem = document.createElement("li");
              emptyItem.className = "empty-participants";
              emptyItem.textContent = "No participants yet.";
              participantsList.appendChild(emptyItem);
            }
          } catch (error) {
            button.disabled = false;
            messageDiv.textContent = error.message;
            messageDiv.className = "error";
            messageDiv.classList.remove("hidden");
          }
        });

        participantsSection.appendChild(participantsList);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
