import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { auth, db, doc, getDoc, collection, getDocs, query, where, setDoc, serverTimestamp } from "./firebase.js";
import { studentKey } from "./utils.js";

const STUDENT_SESSION_KEY = "lms_student_session";

export async function loginStaff(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profileSnap = await getDoc(doc(db, "users", cred.user.uid));
  if (!profileSnap.exists()) {
    await signOut(auth);
    throw new Error(`Role profile not found. Create Firestore document users/${cred.user.uid} with role admin or teacher.`);
  }
  const profile = profileSnap.data();
  if (!["admin", "teacher"].includes(profile.role)) {
    await signOut(auth);
    if (profile.role === "pending_teacher") {
      throw new Error("Your teacher account is pending admin approval.");
    }
    if (profile.role === "rejected_teacher") {
      throw new Error("Your teacher request was rejected by admin.");
    }
    throw new Error("Only approved admin/teacher accounts can login.");
  }
  return { uid: cred.user.uid, ...profile };
}

export function getCurrentStaff() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return resolve(null);
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      if (!profileSnap.exists()) return resolve(null);
      resolve({ uid: user.uid, ...profileSnap.data() });
    });
  });
}

export async function requireStaffRole(roles) {
  const me = await getCurrentStaff();
  if (!me || !roles.includes(me.role)) {
    window.location.href = "./index.html";
    throw new Error("Not authorized.");
  }
  return me;
}

export async function logoutStaff() {
  await signOut(auth);
}

export async function loginStudentByRollName(rollNo, name) {
  const roll = (rollNo || "").trim();
  const cleanName = (name || "").trim();
  const studentQ = query(
    collection(db, "students"),
    where("rollNo", "==", roll),
    where("nameLower", "==", cleanName.toLowerCase())
  );
  const snap = await getDocs(studentQ);
  if (snap.empty) throw new Error("Student not found. Ask teacher to enroll you.");
  const studentDoc = snap.docs[0];
  const session = {
    id: studentDoc.id,
    rollNo: studentDoc.data().rollNo,
    name: studentDoc.data().name,
    key: studentKey(studentDoc.data().rollNo, studentDoc.data().name),
    loggedAt: Date.now(),
  };
  sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function createTeacherRequest(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), {
    role: "pending_teacher",
    name: (name || "").trim(),
    email: (email || "").trim(),
    approved: false,
    createdAt: serverTimestamp(),
  });
  await signOut(auth);
}

export function explainAuthError(err) {
  const code = String(err?.code || "");
  if (code === "auth/invalid-credential") {
    return "Invalid email/password or account does not exist. Create the user in Firebase Authentication first.";
  }
  if (code === "auth/invalid-email") {
    return "Email format is invalid.";
  }
  if (code === "auth/user-disabled") {
    return "This account is disabled in Firebase Authentication.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many failed attempts. Please wait and try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Network error. Check internet connection and try again.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Email/Password login is disabled in Firebase Authentication settings.";
  }
  if (code === "auth/unauthorized-domain") {
    return "Current domain is not authorized in Firebase Authentication.";
  }
  if (code === "permission-denied" || code === "auth/insufficient-permission") {
    return "Firestore rules blocked this operation. Re-publish firestore.rules.";
  }
  return err?.message || "Authentication failed.";
}

export function getStudentSession() {
  try {
    const raw = sessionStorage.getItem(STUDENT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function requireStudentSession() {
  const s = getStudentSession();
  if (!s) {
    window.location.href = "./index.html";
    throw new Error("Student session missing");
  }
  return s;
}

export function logoutStudent() {
  sessionStorage.removeItem(STUDENT_SESSION_KEY);
}
