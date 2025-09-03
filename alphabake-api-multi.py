







import json
import base64
import requests
from pprint import pprint
import time
from dotenv import dotenv_values
import os
import random
import concurrent.futures
from glob import glob
from tqdm import tqdm
import threading
from PIL import Image

#pip install python-dotenv requests tqdm pillow

NUM_THREADS = 5
CURRENT_URL = 'https://api.alphabake.io/'
url = CURRENT_URL + 'api/v2/tryon/'
fetch_url = CURRENT_URL + 'api/v2/tryon_status/'
API_KEY = dotenv_values('.env')['API_KEY'] #add a .env file in the same directory as this file and add the API_KEY as an environment variable
# Define headers with authorization token
headers = {
    'Authorization': 'Bearer ' + API_KEY,
    'Content-Type': 'application/json',
}


output_dir = 'outputs/multi-threaded-test/'

import json

input_json = {
    #  "h20__g4": {
    #     "human_id": "096ee950-e3b0-4c7d-9e47-b2c2ecc5e506-H727",
    #     "garment_id": "cf17d39b-fa31-412f-9285-069af51a5c51-G327",
    #     "garment_type": "full",
    #     "mode": "fast"
    # },
    "h40__g20": {
        "human_url": "https://api-alphabake-public.s3.us-east-1.amazonaws.com/Scale/example-dataset-google-25pairs/h40__g20/human.jpg",
        "garment_url": "https://api-alphabake-public.s3.us-east-1.amazonaws.com/Scale/example-dataset-google-25pairs/h40__g20/garment.jpg",
        "garment_type": "full",
        "mode": "fast"
    },
    "h9__g11": {
        "human_url": "https://api-alphabake-public.s3.us-east-1.amazonaws.com/Scale/example-dataset-google-25pairs/h9__g11/human.jpg",
        "garment_url": "https://api-alphabake-public.s3.us-east-1.amazonaws.com/Scale/example-dataset-google-25pairs/h9__g11/garment.jpg",
        "garment_type": "top",
        "mode": "fast"
    },
}
if not os.path.exists(output_dir):
    os.makedirs(output_dir)


# input_json_path = 'inputs/44pairs.json'
# with open(input_json_path, 'r') as f:
#     input_json = json.load(f)



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


def stack_three_images_and_save(img1, img2, img3, output_file_path):
    """Stack three PIL Images horizontally, upload to S3, and return S3 and presigned URLs."""
    h = max(img1.height, img2.height, img3.height)
    w = img1.width + img2.width + img3.width
    new_img = Image.new('RGB', (w, h))
    new_img.paste(img1, (0, 0))
    new_img.paste(img2, (img1.width, 0))
    new_img.paste(img3, (img1.width + img2.width, 0))
    #save the new_img to output_file_path
    new_img.save(output_file_path)

results_summary = {
    'requests': [],  # Each entry: {"folder": str, "status": str, "duration": float}
    'average_duration': None
}
results_json_path = os.path.join(output_dir, 'results.json')
results_lock = threading.Lock()

def process_folder(folder_name, thread_idx, progress_bars, results, lock):
    start_time = time.time()
    data = {}
    status = 'fail'
    note = ''
    tryon_id = None
    garment_id = None
    human_id = None
    random_number = random.randint(1, 1000000)
    if 'human_id' in input_json[folder_name]:
        data['human_id'] = input_json[folder_name]['human_id']
        human_id = data['human_id']
    else:
        data['human_url'] = input_json[folder_name]['human_url'] + '?v=' + str(random_number)
    if 'garment_id' in input_json[folder_name]:
        data['garment_id'] = input_json[folder_name]['garment_id']
        garment_id = data['garment_id']
    else:
        data['garment_url'] = input_json[folder_name]['garment_url'] + '?v=' + str(random_number)
    data['garment_type'] = input_json[folder_name]['garment_type']
    data['mode'] = 'fast'
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        if response.status_code != 200:
            note = f"ERROR resp {folder_name}, {response.status_code}, {response.text}"
            print(note)
            with lock:
                progress_bars[thread_idx].set_description(f"[Thread {thread_idx+1}] FAIL {folder_name}")
                results[thread_idx]['fail'] += 1
            status = 'fail'
            # Log and return
            duration = time.time() - start_time
            with results_lock:
                results_summary['requests'].append({
                    'folder': folder_name,
                    'status': status,
                    'duration': duration,
                    'note': note,
                    'tryon_id': tryon_id,
                    'garment_url': data.get('garment_url', ''),
                    'human_url': data.get('human_url', ''),
                    'garment_id': garment_id,
                    'human_id': human_id
                })
                with open(results_json_path, 'w') as f:
                    json.dump(results_summary, f, indent=2)
            return
        json_response = response.json()
        tryon_id = json_response.get('tryon_id')
    except Exception as e:
        note = f"Exception: {str(e)}"
        with lock:
            progress_bars[thread_idx].set_description(f"[Thread {thread_idx+1}] ERROR resp {folder_name}")
            results[thread_idx]['fail'] += 1
        status = 'fail'
        duration = time.time() - start_time
        with results_lock:
            results_summary['requests'].append({
                'folder': folder_name,
                'status': status,
                'duration': duration,
                'note': note,
                'tryon_id': tryon_id,
                'garment_url': data.get('garment_url', ''),
                'human_url': data.get('human_url', ''),
                'garment_id': garment_id,
                'human_id': human_id
            })
            with open(results_json_path, 'w') as f:
                json.dump(results_summary, f, indent=2)
        return
    wait_times = [10,5,10,5,10,20,30,30,60] #we time out after 180 seconds
    poll_marks = ''
    poll_count = 0
    for wait in wait_times:
        time.sleep(wait)
        poll_count += 1
        poll_marks += '-'*int(wait)
        status_response = requests.post(fetch_url, headers=headers, data=json.dumps({'tryon_id': tryon_id}))
        with lock:
            elapsed = time.time() - start_time
            progress_bars[thread_idx].set_description(f"[Thread {thread_idx+1}] {results[thread_idx]['done']+results[thread_idx]['fail']+1}/ | {folder_name} | Time: {elapsed:.1f}s | Polls: {poll_marks}")
        if status_response.status_code == 200:
            status_json = status_response.json()
            if status_json['message'] != 'success':
                note = f"API message: {status_json.get('message', '')}"
                with lock:
                    progress_bars[thread_idx].set_description(f"[Thread {thread_idx+1}] FAIL {folder_name}")
                    results[thread_idx]['fail'] += 1
                status = 'fail'
                break
            if status_json['status'] in ['done']:
                try:
                    tryon_url = status_json['s3_url']
                    tryon_out = os.path.join(output_dir, 'tryon', f'{folder_name}.jpg')
                    os.makedirs(os.path.dirname(tryon_out), exist_ok=True)
                    download_image(tryon_url, tryon_out)
                    stacked_out = os.path.join(output_dir, 'stacked', f'{folder_name}.jpg')
                    os.makedirs(os.path.dirname(stacked_out), exist_ok=True)
                    garment_out = os.path.join(output_dir, 'garment', f'{folder_name}.jpg')
                    os.makedirs(os.path.dirname(garment_out), exist_ok=True)
                    stack_3_images = True
                    if 'garment_url' in input_json[folder_name]:
                        download_image(input_json[folder_name]['garment_url'], garment_out)
                        # stack_3_images = False
                    
                    human_out = os.path.join(output_dir, 'human', f'{folder_name}.jpg')
                    os.makedirs(os.path.dirname(human_out), exist_ok=True)
                    if 'human_url' in input_json[folder_name]:
                        download_image(input_json[folder_name]['human_url'], human_out)
                        # stack_3_images = False
                    
                    if stack_3_images:
                        stack_three_images_and_save(Image.open(tryon_out), Image.open(garment_out), Image.open(human_out), stacked_out)
                    with lock:
                        results[thread_idx]['done'] += 1
                        progress_bars[thread_idx].set_description(f"[Thread {thread_idx+1}] {results[thread_idx]['done']+results[thread_idx]['fail']}/ done | {folder_name} | Time: {time.time()-start_time:.1f}s | Polls: {poll_marks}")
                    status = 'success'
                    note = ''
                    garment_id = status_json.get('garment_id')
                    human_id = status_json.get('human_id')
                except Exception as e:
                    note = f"Exception during save: {str(e)}"
                    with lock:
                        progress_bars[thread_idx].set_description(f"[Thread {thread_idx+1}] ERROR save {folder_name}")
                        results[thread_idx]['fail'] += 1
                    status = 'fail'
                break
        else:
            note = f"Status poll failed: {status_response.status_code}, {status_response.text}"
            with lock:
                progress_bars[thread_idx].set_description(f"[Thread {thread_idx+1}] FAIL status {folder_name}")
                results[thread_idx]['fail'] += 1
            status = 'fail'
            break
    else:
        note = 'TIMEOUT waiting for tryon to complete'
        with lock:
            progress_bars[thread_idx].set_description(f"[Thread {thread_idx+1}] TIMEOUT {folder_name}")
            results[thread_idx]['fail'] += 1
        status = 'timeout'
    duration = time.time() - start_time
    # Update global results_summary and results.json
    with results_lock:
        results_summary['requests'].append({
            'folder': folder_name,
            'status': status,
            'duration': duration,
            'note': note,
            'tryon_id': tryon_id,
            'garment_url': data['garment_url'],
            'human_url': data['human_url'],
            'garment_id': garment_id,
            'human_id': human_id
        })
        with open(results_json_path, 'w') as f:
            json.dump(results_summary, f, indent=2)


def main():
    folders = list(input_json.keys())
    total = len(folders)
    print(f"Total folders: {total}")
    n_threads = NUM_THREADS


    # Split folders into n_threads nearly equal chunks
    folder_chunks = [folders[i::n_threads] for i in range(n_threads)]
    progress_bars = [tqdm(total=len(chunk), position=i, leave=True, bar_format='{desc}') for i, chunk in enumerate(folder_chunks)]
    results = [{'done': 0, 'fail': 0} for _ in range(n_threads)]
    lock = threading.Lock()

    def worker(thread_idx, chunk):
        for folder in chunk:
            process_folder(folder, thread_idx, progress_bars, results, lock)
            with lock:
                progress_bars[thread_idx].update(1)

    threads = []
    for i, chunk in enumerate(folder_chunks):
        t = threading.Thread(target=worker, args=(i, chunk))
        t.start()
        threads.append(t)
    for t in threads:
        t.join()
    for bar in progress_bars:
        bar.close()
    print("Summary:")
    for i, res in enumerate(results):
        print(f"Thread {i+1}: {res['done']} succeeded, {res['fail']} failed")
    # Final flush: compute average and write full summary
    with results_lock:
        durations = [r['duration'] for r in results_summary['requests'] if r['status'] == 'success']
        results_summary['average_duration'] = sum(durations)/len(durations) if durations else None
        with open(results_json_path, 'w') as f:
            json.dump(results_summary, f, indent=2)

if __name__ == "__main__":
    import time
    t1 = time.time()
    main()
    t2 = time.time()
    print(f"Time taken: {t2-t1:.1f} seconds")



