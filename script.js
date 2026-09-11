const API_BASE_URL = "http://127.0.0.1:8000";

const form = document.querySelector("#prediction-form");
const predictButton = document.querySelector("#predict-button");
const buttonLabel = predictButton.querySelector(".button-label");
const formError = document.querySelector("#form-error");
const resultCard = document.querySelector("#result-card");
const gaugeProgress = document.querySelector("#gauge-progress");
const gaugeNeedle = document.querySelector("#gauge-needle");
const mainScore = document.querySelector("#score-value");
const predictedScore = document.querySelector("#predicted-score");
const predictedScoreValue = document.querySelector("#predicted-score-value");
const scoreStatus = document.querySelector("#score-status");
const numericInputs = [...document.querySelectorAll("input[type='number']")];

const MIN_SCORE = 3.6;
const MAX_SCORE = 9.4;
let lastValidScore = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPrecision(input) {
  return Number(input.dataset.precision || 0);
}

function getBounds(input) {
  return {
    min: Number(input.min),
    max: input.max === "" ? Number.POSITIVE_INFINITY : Number(input.max),
  };
}

function normalizeValue(input, rawValue) {
  const parsed = Number(rawValue);
  const { min, max } = getBounds(input);
  const multiplier = 10 ** getPrecision(input);
  const safeValue = Number.isFinite(parsed) ? parsed : min;
  const rounded = Math.round((safeValue + Number.EPSILON) * multiplier) / multiplier;

  return Math.min(max, Math.max(min, rounded));
}

function setNumericValue(input, value) {
  const normalized = normalizeValue(input, value);
  input.value = normalized.toFixed(getPrecision(input));
  updateStepperButtons(input);
}

function updateStepperButtons(input) {
  const stepper = input.closest("[data-stepper]");
  if (!stepper) return;

  const value = Number(input.value);
  const { min, max } = getBounds(input);
  const [minusButton, plusButton] = stepper.querySelectorAll(".stepper-button");
  const hasValue = Number.isFinite(value);

  minusButton.disabled = hasValue && value <= min;
  plusButton.disabled = hasValue && value >= max;
}

function adjustValue(input, direction) {
  const step = Number(input.step) || 1;
  const precision = getPrecision(input);
  const multiplier = 10 ** precision;
  const current = Number(input.value);
  const { min } = getBounds(input);
  const startingValue = Number.isFinite(current) ? current : min;
  const nextValue = (Math.round((startingValue + Number.EPSILON) * multiplier) + direction * Math.round(step * multiplier)) / multiplier;

  setNumericValue(input, nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

numericInputs.forEach((input) => {
  setNumericValue(input, input.value);

  const stepper = input.closest("[data-stepper]");
  if (stepper) {
    stepper.addEventListener("click", (event) => {
      const button = event.target.closest(".stepper-button");
      if (!button) return;
      adjustValue(input, Number(button.dataset.direction));
    });
  }

  input.addEventListener("input", () => updateStepperButtons(input));
  input.addEventListener("change", () => setNumericValue(input, input.value));
  input.addEventListener("blur", () => setNumericValue(input, input.value));
});

function normalizeAllNumericInputs() {
  numericInputs.forEach((input) => setNumericValue(input, input.value));
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

function setLoading(isLoading) {
  predictButton.disabled = isLoading;
  predictButton.classList.toggle("is-loading", isLoading);
  buttonLabel.textContent = isLoading ? "Predicting..." : "Predict Mental Health Score";
}

function getScoreState(score) {
  if (score < 5) {
    return { label: "Low", description: "Needs Attention", tone: "low" };
  }

  if (score < 7) {
    return { label: "Medium", description: "Fair", tone: "medium" };
  }

  return { label: "High", description: "Good", tone: "high" };
}

function updateGauge(score) {
  const safeScore = clamp(Number(score), MIN_SCORE, MAX_SCORE);
  const rawPercentage = (safeScore - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  const percentage = clamp(rawPercentage, 0, 1);
  const dashValue = percentage * 100;
  const angle = -90 + percentage * 180;

  gaugeProgress.style.strokeDasharray = `${dashValue} 100`;
  gaugeNeedle.setAttribute("transform", `rotate(${angle} 180 165)`);
}

function animateFinalValue(targetScore) {
  const duration = 800;
  const startTime = performance.now();

  function update(time) {
    const progress = Math.min((time - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const displayedValue = (targetScore * eased).toFixed(2);
    mainScore.textContent = displayedValue;
    predictedScore.textContent = displayedValue;
    predictedScoreValue.textContent = displayedValue;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      mainScore.textContent = targetScore.toFixed(2);
      predictedScore.textContent = targetScore.toFixed(2);
      predictedScoreValue.textContent = targetScore.toFixed(2);
    }
  }

  requestAnimationFrame(update);
}

function resetPredictionDisplay() {
  const placeholder = "—";
  mainScore.textContent = placeholder;
  predictedScore.textContent = placeholder;
  predictedScoreValue.textContent = placeholder;
  gaugeProgress.style.strokeDasharray = "0 100";
  gaugeNeedle.setAttribute("transform", "rotate(-90 180 165)");

  scoreStatus.className = "score-status score-status--neutral";
  scoreStatus.innerHTML = "<span>Awaiting</span><small>Prediction</small>";
}

function showResult(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return;

  lastValidScore = numericScore;
  const state = getScoreState(numericScore);

  scoreStatus.className = `score-status score-status--${state.tone}`;
  scoreStatus.innerHTML = `<span>${state.label}</span><small>${state.description}</small>`;

  updateGauge(numericScore);
  animateFinalValue(numericScore);
}

function buildPayload() {
  return {
    Age: Number(document.querySelector("#age").value),
    Gender: document.querySelector("#gender").value,
    Country: document.querySelector("#country").value,
    Academic_Level: document.querySelector("#academic-level").value,
    Most_Used_Platform: document.querySelector("#platform").value,
    Purpose_Of_Use: document.querySelector("#purpose").value,
    Avg_Daily_Usage_Hours: Number(document.querySelector("#usage-hours").value),
    Daily_Unlocks: Number(document.querySelector("#daily-unlocks").value),
    Study_Hours: Number(document.querySelector("#study-hours").value),
    Physical_Activity_Hours: Number(document.querySelector("#activity-hours").value),
    Sleep_Hours_Per_Night: Number(document.querySelector("#sleep-hours").value),
    Stress_Level: document.querySelector("#stress-level").value,
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  normalizeAllNumericInputs();

  if (!form.checkValidity()) {
    const firstInvalid = form.querySelector(":invalid");
    firstInvalid?.focus();
    showError("Please complete each field with a value in its allowed range.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Prediction API error:", response.status, errorText);
      throw new Error("The prediction service could not process those values.");
    }

    const data = await response.json();
    console.log("Prediction API response:", data);

    const score = Number(data.prediction_mental_health_score);
    if (!Number.isFinite(score)) {
      throw new Error("The prediction service returned an invalid score.");
    }

    showResult(score);
  } catch (error) {
    console.error("Prediction request failed:", error);

    if (lastValidScore !== null) {
      showResult(lastValidScore);
    } else {
      resetPredictionDisplay();
    }

    showError(error.message || "Unable to reach the prediction service. Please try again.");
  } finally {
    setLoading(false);
  }
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    clearError();
    resetPredictionDisplay();
  }, 0);
});

resetPredictionDisplay();
