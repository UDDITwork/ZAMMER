

import json
import requests
from pprint import pprint
import time
from dotenv import dotenv_values
import os

CURRENT_URL = 'https://api.alphabake.io/'
url = CURRENT_URL + 'api/v2/tryon/'
fetch_url = CURRENT_URL + 'api/v2/tryon_status/'

API_KEY = dotenv_values('.env')['API_KEY'] #add a .env file in the same directory as this file and add the API_KEY as an environment variable

def download_image(url, download_path):
    response = requests.get(url)
    if response.status_code == 200:
        with open(download_path, 'wb') as file:
            file.write(response.content)
        print(f"Image downloaded to {download_path}")
        return True
    else:
        print(f"Failed to download image from {url}")
        return None

# Define headers with authorization token
headers = {
    'Authorization': 'Bearer ' + API_KEY,
    'Content-Type': 'application/json',
}

output_tryon_path = 'outputs/tryon.png'
if os.path.exists(output_tryon_path):
    os.remove(output_tryon_path)

output_dir = os.path.dirname(output_tryon_path)
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

data = {
    "human_url": "https://api-alphabake-public.s3.us-east-1.amazonaws.com/Scale/example-dataset-google-25pairs/h40__g20/human.jpg",
    "garment_url": "https://api-alphabake-public.s3.us-east-1.amazonaws.com/Scale/example-dataset-google-25pairs/h40__g20/garment.jpg",
    "garment_type": "full",
    "mode": "fast",
}

t_start = time.time()
response = requests.post(url, headers=headers, data=json.dumps(data))
t_response_sent = time.time()
print(f"Time taken to send response: {(t_response_sent - t_start)} seconds")

if response.status_code == 200:
    json_response = response.json()
    pprint(json_response)
    
    tryon_id = json_response['tryon_id']
    found = False
    time_elapsed = time.time() - t_start
    while not found:
        response = requests.post(fetch_url, headers=headers, data=json.dumps({
            'tryon_id': tryon_id,
        }))
        if response.status_code == 200:
            json_response = response.json()
            if json_response['message'] != 'success':
                found = True
                print("Tryon failed because of", json_response['message'])
            else:
                if json_response['status'] in ['done']:
                    pprint(json_response)
                    t_end = time.time()
                    print("time taken to get response", t_end - t_start)
                    download_image(json_response['s3_url'], output_tryon_path)
                    
                    
                    found = True
                else:
                    time.sleep(2)
                    time_elapsed = (time.time() - t_start)
                    print(f"Time Elapsed:  tryon id {json_response['tryon_id']} to be completed: {time_elapsed} seconds ")
            if time_elapsed > 120:
                found = True
                print("Tryon not found after 120 seconds")
        else:
            found = True
            print(f"Failed to get tryon. Status code: {response.status_code}")
else:
    print(f"Failed to create tryon. Status code: {response.status_code}")
    print(f"Response: {response.text}")


