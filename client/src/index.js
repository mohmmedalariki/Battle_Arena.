import "regenerator-runtime/runtime";
import * as $ from "jquery";
import Phaser from "phaser";
import Game from './game/game.js';
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { auth, provider, signInWithPopup, db } from './firebase-config.js';
import { getDoc } from "firebase/firestore";


document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("googleLoginBtn");
  const overlay = document.getElementById("overlay");
  const guestBtn = document.querySelector('.guestBtn');

  console.log("Overlay element:", overlay);
  console.log("Login button found:", loginBtn);

 loginBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  console.log("Login button clicked");

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("Logged in as:", user.displayName);
    console.log("User UID:", user.uid);

    overlay.style.display = "none";

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    let generatedUsername = "";

    if (userSnap.exists()) {
      
      generatedUsername = userSnap.data().username;
      console.log(" Username already exists:", generatedUsername);
    } else {
      // Generate new username
      const baseName = user.displayName?.replace(/\s/g, '').toLowerCase() || "player";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      generatedUsername = `${baseName}${randomSuffix}`;

      await setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        uid: user.uid,
        username: generatedUsername,
        createdAt: new Date().toISOString()
      });
      console.log("✅ User saved to Firestore:", generatedUsername);
    }

    alert(`Welcome ${user.displayName}! Your username is ${generatedUsername}`);
  } catch (error) {
    console.error("❌ Login or Firestore error:", error.message, error);
    alert("Login failed. Check the console for details.");
  }
});


  guestBtn?.addEventListener('click', () => {
    overlay.style.display = 'none';
    document.body.focus();
  });

  (function () {
    alert("Welcome to Battle Arena!\n\nHow to play:\n- Use arrow keys to move\n- Click to shoot\n- One hit = you're out\n\nBring your friends and have fun!");
    
    let ratio = 16 / 9;
    let width = 1280;
    let height = Math.floor(width / ratio);

    const config = {
      type: Phaser.AUTO,
      width: width,
      height: height,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      },
      scene: Game
    };

    new Phaser.Game(config);
  })();
});
