from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


ACTIVITY_NAME = "Chess Club"


@pytest.fixture
def client(monkeypatch):
    test_activities = deepcopy(app_module.activities)
    monkeypatch.setattr(app_module, "activities", test_activities)

    with TestClient(app_module.app) as test_client:
        yield test_client


def signup_path(activity_name):
    encoded_name = quote(activity_name, safe="")
    return f"/activities/{encoded_name}/signup"


def test_root_redirects_to_index(client):
    # Arrange
    expected_location = "/static/index.html"

    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == expected_location


def test_get_activities_returns_activity_data(client):
    # Arrange
    expected_participants = ["michael@mergington.edu", "daniel@mergington.edu"]

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert response.json()[ACTIVITY_NAME]["participants"] == expected_participants


def test_signup_adds_participant(client):
    # Arrange
    email = "new-student@mergington.edu"
    participants_before = app_module.activities[ACTIVITY_NAME]["participants"].copy()

    # Act
    response = client.post(signup_path(ACTIVITY_NAME), params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for {ACTIVITY_NAME}"}
    assert app_module.activities[ACTIVITY_NAME]["participants"] == participants_before + [email]


def test_signup_returns_404_for_unknown_activity(client):
    # Arrange
    unknown_activity = "Unknown Club"

    # Act
    response = client.post(signup_path(unknown_activity), params={"email": "student@example.com"})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_signup_rejects_duplicate_participant(client):
    # Arrange
    email = "michael@mergington.edu"
    participants_before = app_module.activities[ACTIVITY_NAME]["participants"].copy()

    # Act
    response = client.post(signup_path(ACTIVITY_NAME), params={"email": email})

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up for this activity"
    assert app_module.activities[ACTIVITY_NAME]["participants"] == participants_before


def test_unregister_removes_participant(client):
    # Arrange
    email = "michael@mergington.edu"
    participants_before = app_module.activities[ACTIVITY_NAME]["participants"].copy()

    # Act
    response = client.delete(signup_path(ACTIVITY_NAME), params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from {ACTIVITY_NAME}"}
    assert app_module.activities[ACTIVITY_NAME]["participants"] == [
        participant for participant in participants_before if participant != email
    ]


def test_unregister_returns_404_for_unknown_activity(client):
    # Arrange
    unknown_activity = "Unknown Club"

    # Act
    response = client.delete(signup_path(unknown_activity), params={"email": "student@example.com"})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_returns_404_for_unregistered_participant(client):
    # Arrange
    email = "not-registered@mergington.edu"
    participants_before = app_module.activities[ACTIVITY_NAME]["participants"].copy()

    # Act
    response = client.delete(signup_path(ACTIVITY_NAME), params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"
    assert app_module.activities[ACTIVITY_NAME]["participants"] == participants_before