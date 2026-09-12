// ===================================================
// 우리 반 담벼락 - Firebase Firestore 연동
// ===================================================

// Firebase SDK 불러오기 (CDN ES Module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Firebase 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyBXVofsstdUtxWCpPwvkNrW0YsjjZpGSzc",
  authDomain: "test-class-good.firebaseapp.com",
  projectId: "test-class-good",
  storageBucket: "test-class-good.firebasestorage.app",
  messagingSenderId: "669452417840",
  appId: "1:669452417840:web:b89750523a74f7b348e6f5"
};

// Firebase 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ===================================================
// 데이터를 다루는 함수 세 개 (Firestore 연동)
// ===================================================

// 메모를 읽어 옵니다.
// Firestore의 "memos" 컬렉션에서 createdAt 기준 오름차순으로 목록을 불러옵니다.
async function loadMemos() {
  const q = query(collection(db, "memos"), orderBy("createdAt"));
  const querySnapshot = await getDocs(q);
  const memoList = [];
  querySnapshot.forEach(function (docSnap) {
    memoList.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });
  return memoList;
}

// 메모를 새로 씁니다.
// Firestore "memos" 컬렉션에 새 메모 문서를 추가합니다.
async function addMemo(text) {
  await addDoc(collection(db, "memos"), {
    text: text,
    createdAt: Date.now()
  });
}

// 메모를 지웁니다.
// Firestore "memos" 컬렉션에서 해당 문서(id)를 삭제합니다.
async function deleteMemo(id) {
  await deleteDoc(doc(db, "memos", id));
}


// ===================================================
// 화면 그리기
// ===================================================

async function render() {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  const memos = await loadMemos();
  memos.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  const del = document.createElement("button");
  del.textContent = "×";
  del.onclick = async function () {
    await deleteMemo(memo.id);
    render();
  };
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 이벤트 및 실시간 동기화
// ===================================================

// Firestore 실시간 감지: 데이터가 변경되면 자동으로 화면을 갱신합니다.
const memoQuery = query(collection(db, "memos"), orderBy("createdAt"));
onSnapshot(memoQuery, function () {
  render();
});

// 메모 쓰는 칸
const input = document.getElementById("input");

input.onkeydown = async function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    await addMemo(text);
    input.value = "";
    render();
  }
};

// 첫 화면 그리기
render();
input.focus();

