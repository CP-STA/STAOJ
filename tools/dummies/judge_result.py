from operator import sub
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import firestore
import urllib.request, json 
import time
import numpy as np

load_dotenv()
app = firebase_admin.initialize_app()
db = firestore.client()

submission = input("submission document id: ").strip()

doc_ref = db.collection('submissions').document(submission)
doc = doc_ref.get()
problem = doc.to_dict()['problem']

rng = np.random.default_rng(1)

with urllib.request.urlopen(f"https://raw.githubusercontent.com/CP-STA/contest-problems/main/{problem}/test-cases.json") as url:
    test_cases = json.loads(url.read().decode())

subcollection = doc_ref.collection("judge-results")

subcollection.add({
  "state": "compiling",
  "judgeTime": firestore.SERVER_TIMESTAMP
})

time.sleep(1)

subcollection.add({
  "state": "compiled",
  "judgeTime": firestore.SERVER_TIMESTAMP
})

time.sleep(1)

for i in range(len(test_cases)):
  subcollection.add({
    "state": "testing",
    "testCase": i +1,
    "judgeTime": firestore.SERVER_TIMESTAMP
  })
  time.sleep(.5)
  if i == 1:
    subcollection.add({
      "state": "tested",
      "result": "TLE",
      "time": int(rng.integers(100, 1000)),
      "memory": int(rng.integers(128000, 256000)),
      "testCase": i+1,
      "judgeTime": firestore.SERVER_TIMESTAMP
    })
  else:
    subcollection.add({
      "state": "tested",
      "result": "accepted",
      "time": int(rng.integers(100, 1000)),
      "memory": int(rng.integers(128000, 256000)),
      "testCase": i+1,
      "judgeTime": firestore.SERVER_TIMESTAMP
    })


