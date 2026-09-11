import joblib
from pydantic import BaseModel, Field
from fastapi import FastAPI
import pandas as pd
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware

# Load trained model
model = joblib.load("mental_health_model.pkl")


# Create FastAPI app
app = FastAPI()


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Top countries
top_countries = [
    "Other",
    "India",
    "USA",
    "Canada",
    "Australia",
    "UK",
    "Germany",
    "Mexico",
    "Turkey",
    "France"
]


# Pydantic model for input data
class StudentData(BaseModel):

    Age: int = Field(
        ...,
        gt=0,
        le=100,
        description="Age of the student in years"
    )

    Gender: Literal["Male", "Female"]

    Country: str

    Academic_Level: Literal[
        "Undergraduate",
        "Graduate",
        "High School"
    ]

    Most_Used_Platform: Literal[
        "Facebook",
        "LinkedIn",
        "Instagram",
        "Snapchat",
        "Twitter",
        "YouTube",
        "TikTok",
        "LINE",
        "KakaoTalk",
        "VKontakte",
        "WhatsApp",
        "WeChat"
    ]

    Purpose_Of_Use: Literal[
        "Networking",
        "Education",
        "Entertainment",
        "News"
    ]

    Avg_Daily_Usage_Hours: float = Field(
        ...,
        gt=0,
        le=24,
        description="Average daily usage hours of social media"
    )

    Daily_Unlocks: int = Field(
        ...,
        gt=0,
        description="Number of times the phone is unlocked daily"
    )

    Study_Hours: float = Field(
        ...,
        gt=0,
        le=24,
        description="Number of hours spent studying daily"
    )

    Physical_Activity_Hours: float = Field(
        ...,
        gt=0,
        le=24,
        description="Number of hours spent on physical activity daily"
    )

    Sleep_Hours_Per_Night: float = Field(
        ...,
        gt=0,
        le=24,
        description="Number of hours slept per night"
    )

    Stress_Level: Literal[
        "Low",
        "Medium",
        "High",
        "Very High"
    ]


# Response model
class PredictionResponse(BaseModel):

    prediction_mental_health_score: float


# Greeting function
def greet(name: str):

    return {
        "message": f"Hello {name}, welcome to the Mental Health Prediction API!"
    }


# Root endpoint
@app.get("/")
def read_root():

    return greet("User")


# Prediction endpoint
@app.post("/predict", response_model=PredictionResponse)
def predict(data: StudentData):

    # -----------------------------
    # Country handling
    # -----------------------------

    country = data.Country

    if country not in top_countries:
        country = "Other"

    # Create group_countries because
    # trained model expects this column
    group_countries = country


    # -----------------------------
    # Create input DataFrame
    # -----------------------------

    input_data = pd.DataFrame([{
        "Age": data.Age,
        "Gender": data.Gender,
        "Country": country,
        "group_countries": group_countries,
        "Academic_Level": data.Academic_Level,
        "Most_Used_Platform": data.Most_Used_Platform,
        "Purpose_Of_Use": data.Purpose_Of_Use,
        "Avg_Daily_Usage_Hours": data.Avg_Daily_Usage_Hours,
        "Daily_Unlocks": data.Daily_Unlocks,
        "Study_Hours": data.Study_Hours,
        "Physical_Activity_Hours": data.Physical_Activity_Hours,
        "Sleep_Hours_Per_Night": data.Sleep_Hours_Per_Night,
        "Stress_Level": data.Stress_Level

    }])


    # -----------------------------
    # Debug information
    # -----------------------------

    print("\nINPUT DATA:")
    print(input_data)

    print("\nINPUT COLUMNS:")
    print(input_data.columns.tolist())


    # -----------------------------
    # Make prediction
    # -----------------------------

    prediction = model.predict(input_data)[0]


    print("\nRAW PREDICTION:")
    print(prediction)


    # -----------------------------
    # Return prediction
    # -----------------------------

    return PredictionResponse(
        prediction_mental_health_score=round(
            float(prediction),
            2
        )
    )