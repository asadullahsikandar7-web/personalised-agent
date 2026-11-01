
import getpass
import json
import os
from pathlib import Path

import requests

BASE_URL = "http://192.168.13.32:4000"
OUTPUT_FILE = Path("robo-pairing.json")


def get_response_data(response):
    try:
        payload = response.json()
    except ValueError:
        payload = {}

    if not response.ok:
        message = (
            payload.get("message")
            or payload.get("error")
            or "No error message provided"
        )
        raise RuntimeError(
            f"API returned HTTP {response.status_code}: {message}"
        )

    data = payload.get("data", payload)

    while isinstance(data, dict) and isinstance(data.get("data"), dict):
        data = data["data"]

    if not isinstance(data, dict):
        raise RuntimeError("Unexpected API response format.")

    return data
def main():
    email = input("Personal Agent account email: ").strip()
    password = getpass.getpass("Personal Agent password: ")

    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=15,
    )

    auth = get_response_data(login_response)
    access_token = auth.get("accessToken")

    if not access_token:
        raise RuntimeError(
            "Login succeeded, but accessToken was not found in the response."
        )

    print("Login successful.")

    registration_response = requests.post(
        f"{BASE_URL}/api/robots",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"name": "Robo Freenove Pi"},
        timeout=15,
    )

    registration = get_response_data(registration_response)
    robot = registration.get("robot")
    pairing_token = registration.get("pairingToken")

    if not isinstance(robot, dict) or not pairing_token:
        raise RuntimeError(
            "Registration response did not contain robot and pairingToken."
        )

    device_id = robot.get("deviceId")

    if not device_id:
        raise RuntimeError("Registration response has no deviceId.")

    config = {
        "base_url": BASE_URL,
        "device_id": device_id,
        "pairing_token": pairing_token,
        "robot_name": robot.get("name", "Robo Freenove Pi"),
    }

    OUTPUT_FILE.write_text(json.dumps(config, indent=2) + "\n")
    os.chmod(OUTPUT_FILE, 0o600)

    print("\nRobot registered successfully!")
    print("Robot name:", config["robot_name"])
    print("Device ID:", device_id)
    print("Pairing credentials saved to:", OUTPUT_FILE)
    print("The pairing token has not been printed.")


if __name__ == "__main__":
    main()

