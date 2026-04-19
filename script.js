const STORAGE_KEY = "hgad_quote_request";
const COUNTRIESNOW_BASE_URL = "https://countriesnow.space/api/v0.1/countries";

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setFooterYear();
  initQuoteForm();
});

function setupNavigation() {
  const header = document.getElementById("header");
  const navToggle = document.querySelector(".nav-toggle");
  const navBar = document.getElementById("nav-bar");
  const desktopQuery = window.matchMedia("(min-width: 900px)");

  if (!header || !navToggle || !navBar) {
    return;
  }

  const closeMenu = () => {
    header.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navBar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", (event) => {
      if (event.matches) {
        closeMenu();
      }
    });
  } else {
    desktopQuery.addListener((event) => {
      if (event.matches) {
        closeMenu();
      }
    });
  }
}

function setFooterYear() {
  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }
}

async function initQuoteForm() {
  const form = document.getElementById("form");
  const messageBox = document.getElementById("form-message");
  const submitButton = document.getElementById("submit");
  const preview = document.getElementById("request-preview");
  const previewBody = document.getElementById("request-preview-body");
  const countrySelect = document.getElementById("country");
  const governorateSelect = document.getElementById("governorate");
  const citySelect = document.getElementById("city");
  const fullLocationInput = document.getElementById("location");
  const submittedAtInput = document.getElementById("submitted-at");

  if (
    !form ||
    !messageBox ||
    !submitButton ||
    !preview ||
    !previewBody ||
    !countrySelect ||
    !governorateSelect ||
    !citySelect ||
    !submittedAtInput
  ) {
    return;
  }

  const savedDraft = readStoredDraft();
  restoreTextInputs(savedDraft);

  let localCitiesData = {};
  let countriesLoadedFromApi = false;

  try {
    localCitiesData = await fetchLocalCitiesData();
  } catch (error) {
    localCitiesData = {};
  }

  try {
    const countries = await fetchCountriesFromApi();
    populateSelect(countrySelect, "Select country", countries);
    countriesLoadedFromApi = countries.length > 0;
  } catch (error) {
    if (Object.keys(localCitiesData).length > 0) {
      populateSelect(
        countrySelect,
        "Select country",
        sortValues(Object.keys(localCitiesData)),
      );
      setMessage(
        messageBox,
        "CountriesNow could not be reached, so the local location data is being used instead.",
        "warning",
      );
    }
  }

  if (!countriesLoadedFromApi && Object.keys(localCitiesData).length === 0) {
    countrySelect.disabled = true;
    governorateSelect.disabled = true;
    citySelect.disabled = true;
    setMessage(
      messageBox,
      "Location data is temporarily unavailable right now. You can still describe the project location in your message.",
      "warning",
    );
    return;
  }

  await restoreLocation(
    savedDraft,
    localCitiesData,
    countrySelect,
    governorateSelect,
    citySelect,
  );

  countrySelect.addEventListener("change", async () => {
    const selectedCountry = countrySelect.value;

    await populateStates(
      selectedCountry,
      localCitiesData,
      governorateSelect,
      citySelect,
      messageBox,
    );
    populateSelect(citySelect, "Select city", []);
    citySelect.disabled = true;
    persistDraft(form);
  });

  governorateSelect.addEventListener("change", async () => {
    const selectedCountry = countrySelect.value;
    const selectedGovernorate = governorateSelect.value;

    await populateCities(
      selectedCountry,
      selectedGovernorate,
      localCitiesData,
      citySelect,
      messageBox,
    );
    persistDraft(form);
  });

  citySelect.addEventListener("change", () => persistDraft(form));
  form.addEventListener("input", () => persistDraft(form));
  form.addEventListener("change", () => persistDraft(form));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    setMessage(messageBox, "Sending your request...", "warning");

    // 1. Gather the data from the form
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // 2. Prepare the parameters to match your EmailJS Template variables EXACTLY
    const templateParams = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      project: data.project,
      location: formatLocation(data), // This uses your JS function to combine City, State, Country
      message: data.message, // This is the raw message text
    };

    const serviceId = form.dataset.emailjsServiceId?.trim();
    const templateId = form.dataset.emailjsTemplateId?.trim();
    const publicKey = form.dataset.emailjsPublicKey?.trim();

    try {
      // 3. Switch to emailjs.send (passing the object, not the form element)
      await window.emailjs.send(
        serviceId,
        templateId,
        templateParams,
        publicKey,
      );

      clearStoredDraft();
      form.reset();
      // Reset your custom dropdowns
      populateSelect(governorateSelect, "Select governorate / state", []);
      populateSelect(citySelect, "Select city", []);
      governorateSelect.disabled = true;
      citySelect.disabled = true;

      setMessage(
        messageBox,
        "Your request has been sent successfully.",
        "success",
      );
    } catch (error) {
      console.error("EmailJS Error:", error);
      setMessage(
        messageBox,
        "The request could not be sent. Please try again.",
        "error",
      );
    } finally {
      submitButton.disabled = false;
    }
  });
}

function restoreTextInputs(savedDraft) {
  if (!savedDraft) {
    return;
  }

  ["name", "email", "phone", "project", "message"].forEach((fieldName) => {
    const input = document.getElementById(fieldName);

    if (input && typeof savedDraft[fieldName] === "string") {
      input.value = savedDraft[fieldName];
    }
  });
}

async function restoreLocation(
  savedDraft,
  localCitiesData,
  countrySelect,
  governorateSelect,
  citySelect,
) {
  populateSelect(governorateSelect, "Select governorate / state", []);
  governorateSelect.disabled = true;
  populateSelect(citySelect, "Select city", []);
  citySelect.disabled = true;

  if (!savedDraft?.country) {
    return;
  }

  countrySelect.value = savedDraft.country;
  await populateStates(
    savedDraft.country,
    localCitiesData,
    governorateSelect,
    citySelect,
  );

  if (!savedDraft.governorate) {
    return;
  }

  const availableStates = getSelectValues(governorateSelect);

  if (!availableStates.includes(savedDraft.governorate)) {
    return;
  }

  governorateSelect.value = savedDraft.governorate;
  await populateCities(
    savedDraft.country,
    savedDraft.governorate,
    localCitiesData,
    citySelect,
  );

  const availableCities = getSelectValues(citySelect);

  if (savedDraft.city && availableCities.includes(savedDraft.city)) {
    citySelect.value = savedDraft.city;
  }
}

function populateSelect(select, placeholder, values) {
  select.replaceChildren();

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.append(placeholderOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function sortValues(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

function getSelectValues(select) {
  return Array.from(select.options)
    .slice(1)
    .map((option) => option.value)
    .filter(Boolean);
}

function formatRequestSummary(data) {
  const location = formatLocation(data);

  return [
    "HGAD Quote Request",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Project: ${data.project}`,
    `Location: ${location}`,
    "",
    "Project brief:",
    data.message.trim(),
  ].join("\n");
}

function formatLocation(data) {
  return (
    [data.city, data.governorate, data.country].filter(Boolean).join(", ") ||
    "To be confirmed"
  );
}

async function populateStates(
  country,
  localCitiesData,
  governorateSelect,
  citySelect,
  messageBox,
) {
  populateSelect(governorateSelect, "Select governorate / state", []);
  governorateSelect.disabled = true;
  populateSelect(citySelect, "Select city", []);
  citySelect.disabled = true;

  if (!country) {
    return;
  }

  try {
    const states = await fetchStatesFromApi(country);
    populateSelect(governorateSelect, "Select governorate / state", states);
    governorateSelect.disabled = states.length === 0;

    if (messageBox?.classList.contains("is-warning")) {
      setMessage(messageBox, "", "");
    }
    return;
  } catch (error) {
    const fallbackStates = localCitiesData[country]
      ? sortValues(Object.keys(localCitiesData[country]))
      : [];

    populateSelect(
      governorateSelect,
      "Select governorate / state",
      fallbackStates,
    );
    governorateSelect.disabled = fallbackStates.length === 0;

    if (fallbackStates.length > 0 && messageBox) {
      setMessage(
        messageBox,
        "Live state data is unavailable for this selection, so the local location list is being used.",
        "warning",
      );
    }
  }
}

async function populateCities(
  country,
  governorate,
  localCitiesData,
  citySelect,
  messageBox,
) {
  populateSelect(citySelect, "Select city", []);
  citySelect.disabled = true;

  if (!country || !governorate) {
    return;
  }

  try {
    const cities = await fetchCitiesFromApi(country, governorate);
    populateSelect(citySelect, "Select city", cities);
    citySelect.disabled = cities.length === 0;

    if (messageBox?.classList.contains("is-warning")) {
      setMessage(messageBox, "", "");
    }
    return;
  } catch (error) {
    const fallbackCities = localCitiesData[country]?.[governorate]
      ? sortValues(localCitiesData[country][governorate])
      : [];

    populateSelect(citySelect, "Select city", fallbackCities);
    citySelect.disabled = fallbackCities.length === 0;

    if (fallbackCities.length > 0 && messageBox) {
      setMessage(
        messageBox,
        "Live city data is unavailable for this selection, so the local location list is being used.",
        "warning",
      );
    }
  }
}

async function fetchCountriesFromApi() {
  const payload = await fetchJson(COUNTRIESNOW_BASE_URL);
  const countries = Array.isArray(payload.data)
    ? payload.data.map((entry) => entry.country || entry.name).filter(Boolean)
    : [];

  return sortValues(countries);
}

async function fetchStatesFromApi(country) {
  const payload = await fetchJson(`${COUNTRIESNOW_BASE_URL}/states`, {
    method: "POST",
    body: JSON.stringify({ country }),
  });
  const states = Array.isArray(payload.data?.states)
    ? payload.data.states
        .map((state) => state.name || state.state_name || state)
        .filter(Boolean)
    : [];

  return sortValues(states);
}

async function fetchCitiesFromApi(country, state) {
  const payload = await fetchJson(`${COUNTRIESNOW_BASE_URL}/state/cities`, {
    method: "POST",
    body: JSON.stringify({ country, state }),
  });
  const cities = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.data?.cities)
      ? payload.data.cities
      : [];

  return sortValues(cities);
}

async function fetchLocalCitiesData() {
  const response = await fetch("groupedCities.json", { cache: "force-cache" });

  if (!response.ok) {
    throw new Error(`Failed to load groupedCities.json (${response.status})`);
  }

  return response.json();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const payload = await response.json();

  if (payload.error) {
    throw new Error(payload.msg || "The request returned an error");
  }

  return payload;
}

function persistDraft(form) {
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Ignore storage issues and keep the page usable.
  }
}

function readStoredDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function clearStoredDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Ignore storage issues and keep the page usable.
  }
}

function setMessage(element, text, state = "") {
  element.textContent = text;
  element.className = state ? `form-message is-${state}` : "form-message";
}
