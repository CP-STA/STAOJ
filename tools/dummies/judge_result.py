from operator import sub
from xml.dom.expatbuilder import DOCUMENT_NODE
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import firestore
import urllib.request, json 
import time
import numpy as np

# Define if waiting is needed between results
wait = True

# One Hot encoding: See https://github.com/CP-STA/STAOJ/issues/15, if it is false, we use enum.
one_hot = False

# Rng with seed to make sure every run gives the same result (except for the judgeTime)
rng = np.random.default_rng(1)

# Initialise App 
# Place the GOOGLE_APPLICATION_CREDENTIALS env variable in the file named .env, and it will be loaded by this function
load_dotenv()
app = firebase_admin.initialize_app()
db = firestore.client()

# Ask for submission and get the relevant doc
submission = input("submission document id: ").strip()
doc_ref = db.collection('submissions').document(submission)
doc = doc_ref.get()
problem = doc.to_dict()['problem']
subcollection = doc_ref.collection("judge-results")

# Load the problem file (should have loaded it just from local file, but welp, I'm too lazy to change it)
with urllib.request.urlopen(f"https://raw.githubusercontent.com/CP-STA/contest-problems/main/{problem}/test-cases.json") as url:
    test_cases = json.loads(url.read().decode())

# Simulate judge result

# Start Compiling
subcollection.add({
  "state": "compiling",
  "judgeTime": firestore.SERVER_TIMESTAMP
})

if one_hot:
  doc_ref.update({
    "compiling": True
  })
else:
  doc_ref.update({
    "state": "compiling"
  })

if wait:
  time.sleep(1)

# Compilation Done
subcollection.add({
  "state": "compiled",
  "judgeTime": firestore.SERVER_TIMESTAMP
})

if one_hot:
  # States needs to both flipped at the same time to prevent the state going back to queuing. 
  doc_ref.update({
    "compiling": False,
    "compiled": True
  })
else:
  doc_ref.update({
    "state": "compiled"
  })

if wait:
  time.sleep(1)

if one_hot:
  doc_ref.update({
      "compiled": False,
      "judging": True
  })
else:
  doc_ref.update({
    "state": "judging"
  })

for i in range(len(test_cases)):
  subcollection.add({
    "state": "testing",
    "testCase": i +1,
    "subtask": test_cases[i]['subtask'],
    "judgeTime": firestore.SERVER_TIMESTAMP
  })
  if wait:
    time.sleep(.5)
  if i == 1:
    # Test Case 2 TLE
    subcollection.add({
      "state": "tested",
      "result": "TLE",
      "time": int(rng.integers(100, 1000)),
      "memory": int(rng.integers(128000, 256000)),
      "testCase": i+1,
      "subtask": test_cases[i]['subtask'],
      "judgeTime": firestore.SERVER_TIMESTAMP
    })
    doc_ref.update({
      "failedSubtasks": firestore.ArrayUnion([test_cases[i]['subtask']])
    })
  elif i == 2:
    # Test Case 3 MLE
    subcollection.add({
      "state": "tested",
      "result": "MLE",
      "time": int(rng.integers(100, 1000)),
      "memory": int(rng.integers(128000, 256000)),
      "testCase": i+1,
      "subtask": test_cases[i]['subtask'],
      "judgeTime": firestore.SERVER_TIMESTAMP
    })
    doc_ref.update({
      "failedSubtasks": firestore.ArrayUnion([test_cases[i]['subtask']])
    }) 
  elif i == 3:
    # Test Case 4 wrong
    subcollection.add({
      "state": "tested",
      "result": "wrong",
      "time": int(rng.integers(100, 1000)),
      "memory": int(rng.integers(128000, 256000)),
      "testCase": i+1,
      "subtask": test_cases[i]['subtask'],
      "judgeTime": firestore.SERVER_TIMESTAMP
    })
    doc_ref.update({
      "failedSubtasks": firestore.ArrayUnion([test_cases[i]['subtask']])
    })  
  elif i == 4:
    # Test Case 5 error
    subcollection.add({
      "state": "tested",
      "result": "error",
      "time": int(rng.integers(100, 1000)),
      "memory": int(rng.integers(128000, 256000)),
      "testCase": i+1,
      "subtask": test_cases[i]['subtask'],
      "judgeTime": firestore.SERVER_TIMESTAMP
    })
    doc_ref.update({
      "failedSubtasks": firestore.ArrayUnion([test_cases[i]['subtask']])
    })   
  else:
    subcollection.add({
      "state": "tested",
      "result": "accepted",
      "time": int(rng.integers(100, 1000)),
      "memory": int(rng.integers(128000, 256000)),
      "testCase": i+1,
      "subtask": test_cases[i]['subtask'],
      "judgeTime": firestore.SERVER_TIMESTAMP
    })

# Update the calculated score. 
if one_hot:
  doc_ref.update({
    "score": 0.7,
    "judging": False,
    "judged": True
  })
else:
  doc_ref.update({
    "score": 0.7, 
    "state": "judged"
  })

