(async () => {
  if (window.location.pathname !== "/ess") {
    alert(`Please run this script from the schedule page! Click on the arrow to the right of "My Schedule". Make sure to wait for the schedule to load on the right side of the screen.`);
    throw new Error("Not on schedule page.");
  }
  let getShifts = () => {
    const $groups = Array.from(document.querySelectorAll(".group"));
    if ($groups.length === 0) {
      alert("No shifts found. Please make sure you are on the schedule page (/ess#/) and the events view is visible and loaded.");
      throw new Error("No shifts found.");
    }
    const shifts = [];
    for (const $group of $groups) {
      const rawDateString = $group.id.slice(5);
      const year = rawDateString.slice(0, 4);
      const monthString = rawDateString.slice(4, 6);
      const month = parseInt(monthString) - 1;
      const day = rawDateString.slice(6, 8);
      for (const $event of $group.querySelectorAll(".shift-event-template.event-template")) {
        const $rawTitle = $event.querySelector(".event-title");
        if (!$rawTitle) {
          // If no title, then its either a call off or open shift
          continue;
        }

        const $parent = $event.parentElement;
        const splitId = $parent.id.split("-");
        const uuid = splitId[splitId.length - 1];
        const $title = $rawTitle.querySelector("strong");
        let title = $title.innerText || "Work";
        if (title.includes("[")) {
          title = title.slice(0, title.indexOf("["));
        }
        title = title.trim();
        const $time = $event.querySelector("time");
        const timeString = $time.textContent;
        const startTime = timeString.slice(0, timeString.indexOf("-")).trim();
        const endTime = timeString.slice(timeString.indexOf("-") + 1).trim();
        const startAMPM = startTime.slice(startTime.length - 2);
        const endAMPM = endTime.slice(endTime.length - 2);
        const startMinutes = startTime.slice(startTime.indexOf(":") + 1, startTime.indexOf(" "));
        const endMinutes = endTime.slice(endTime.indexOf(":") + 1, endTime.indexOf(" "));
        const startHour = startAMPM === "PM" ? parseInt(startTime.slice(0, startTime.indexOf(":"))) + 12 : parseInt(startTime.slice(0, startTime.indexOf(":")));
        const endHour = endAMPM === "PM" ? parseInt(endTime.slice(0, endTime.indexOf(":"))) + 12 : parseInt(endTime.slice(0, endTime.indexOf(":")));
        // toJSON is a workaround for not being able to pass Date objects from the browser context to node
        const start = new Date(year, month, day, startHour, startMinutes);
        let end = new Date(year, month, day, endHour, endMinutes);
        if (end < start) {
          end = new Date(year, month, parseInt(day) + 1, endHour, endMinutes);
        }
        shifts.push({ title, start, end, uuid });
      }
    }
    return shifts;
  }
  let formatICalDate = (date) => {
    return (
      date.getUTCFullYear() +
      ("0" + (date.getUTCMonth() + 1)).slice(-2) +
      ("0" + date.getUTCDate()).slice(-2) +
      "T" +
      ("0" + date.getUTCHours()).slice(-2) +
      ("0" + date.getUTCMinutes()).slice(-2) +
      ("0" + date.getUTCSeconds()).slice(-2) +
      "Z"
    );
  };
  let arrayToICal = (shifts) => {
    if (!Array.isArray(shifts) || shifts.length === 0) {
      throw new Error("Input is not a valid array of shifts.");
    }

    let iCalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//UKG Dimensions Calendar//EN\n`;

    shifts.forEach((shift, index) => {
      const { title, start, end, uuid } = shift;

      iCalData += `BEGIN:VEVENT
UID:${uuid}@${window.location.hostname}
DTSTAMP:${formatICalDate(new Date())}
DTSTART:${formatICalDate(new Date(start))}
DTEND:${formatICalDate(new Date(end))}
SUMMARY:${title}
END:VEVENT\n`;
    });

    iCalData += "END:VCALENDAR";
    return iCalData;
  }
  let downloadICal = (shifts) => {
    const iCalData = arrayToICal(shifts);
    const blob = new Blob([iCalData], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shifts.ics";
    a.click();
    window.URL.revokeObjectURL(url);
  }
  downloadICal(getShifts());
  alert("Next steps: \n1. Go to https://calendar.google.com/calendar/r/settings/export \n2. Select the file you just downloaded (check your downloads) \n3. Click import")
})();
