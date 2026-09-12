// ===================================================
// 우리 반 담벼락 - Firebase Firestore & Auth 연동
// ===================================================

// Firebase SDK 불러오기 (CDN ES Module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Firebase 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyBXVofsstdUtxWCpPwvkNrW0YsjjZpGSzc",
  authDomain: "test-class-good.firebaseapp.com",
  projectId: "test-class-good",
  storageBucket: "test-class-good.firebasestorage.app",
  messagingSenderId: "669452417840",
  appId: "1:669452417840:web:b89750523a74f7b348e6f5"
};

// Firebase, Firestore, Auth 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 현재 로그인된 사용자 정보 및 역할 (teacher / student)
let currentUser = null;
let currentUserRole = "student";


// ===================================================
// 사용자 역할(Role) 불러오기 / 저장하기
// ===================================================

async function loadUserRole(uid, email) {
  try {
    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      return userSnap.data().role || "student";
    } else {
      // 신규 사용자는 기본적으로 'student' 역할로 저장
      const defaultRole = "student";
      await setDoc(userDocRef, { 
        role: defaultRole, 
        email: email || "",
        createdAt: Date.now()
      });
      return defaultRole;
    }
  } catch (error) {
    console.error("사용자 역할 조회 실패:", error);
    return "student";
  }
}


// ===================================================
// 로그인 / 사용자 상태 관리
// ===================================================

function renderUserArea(user) {
  const userArea = document.getElementById("userArea");
  userArea.innerHTML = "";

  if (user) {
    const roleText = currentUserRole === "teacher" ? "교사" : "학생";

    const span = document.createElement("span");
    span.textContent = `${user.displayName || user.email || "사용자"}님 (${roleText}) 환영합니다! `;
    userArea.appendChild(span);

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.onclick = function () {
      signOut(auth);
    };
    userArea.appendChild(logoutBtn);
  } else {
    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Google 로그인";
    loginBtn.onclick = function () {
      signInWithPopup(auth, googleProvider).catch(function (error) {
        console.error("로그인 실패:", error);
        alert("로그인에 실패했습니다: " + error.message);
      });
    };
    userArea.appendChild(loginBtn);
  }
}

// 로그인 상태 변경 감지
onAuthStateChanged(auth, async function (user) {
  currentUser = user;
  if (user) {
    currentUserRole = await loadUserRole(user.uid, user.email);
  } else {
    currentUserRole = "student";
  }
  renderUserArea(user);
  render();
});


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
// Firestore "memos" 컬렉션에 새 메모 문서를 추가합니다. (5글자 이상만 저장)
// 학생은 본인의 uid로만 작성할 수 있으며, 로그인된 경우 작성자 uid와 이름을 기록합니다.
async function addMemo(text) {
  if (!text || text.trim().length < 5) {
    return;
  }
  const memoData = {
    text: text.trim(),
    createdAt: Date.now()
  };

  if (currentUser) {
    memoData.uid = currentUser.uid;
    memoData.author = currentUser.displayName || currentUser.email || "익명";
  }

  await addDoc(collection(db, "memos"), memoData);
}

// 메모를 지웁니다.
// Firestore "memos" 컬렉션에서 해당 문서(id)를 삭제합니다.
// 교사는 모든 메모를 지울 수 있고, 학생은 본인이 쓴 메모만 지울 수 있습니다.
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

  // 교사(teacher)이거나, 본인이 작성한 메모이거나, 작성자 정보가 없는 기존 메모인 경우 삭제 버튼 표시
  const canDelete = currentUserRole === "teacher" || !memo.uid || (currentUser && memo.uid === currentUser.uid);

  if (canDelete) {
    const del = document.createElement("button");
    del.textContent = "×";
    del.onclick = async function () {
      await deleteMemo(memo.id);
      render();
    };
    div.appendChild(del);
  }

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  if (memo.author) {
    const authorDiv = document.createElement("div");
    authorDiv.style.fontSize = "12px";
    authorDiv.style.color = "#888";
    authorDiv.style.marginTop = "6px";
    authorDiv.textContent = `- ${memo.author}`;
    div.appendChild(authorDiv);
  }

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
    if (text.length < 5) {
      alert("메모는 5글자 이상 입력해 주세요.");
      return;
    }

    await addMemo(text);
    input.value = "";
    render();
  }
};

// 첫 화면 그리기
render();
input.focus();



