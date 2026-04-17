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
  const loginForm = document.getElementById("loginForm");
  const teamSelectionForm = document.getElementById("teamSelectionForm");
  const teamBtns = document.querySelectorAll('.team-btn');

  console.log("Overlay element:", overlay);
  console.log("Login button found:", loginBtn);

  // Store selected team
  let selectedTeam = null;

 loginBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  console.log("Login button clicked");

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("Logged in as:", user.displayName);
    console.log("User UID:", user.uid);

    // Don't hide overlay yet, show team selection instead
    showTeamSelection();

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
    // Show team selection for guest users too
    showTeamSelection();
  });

  // Function to show team selection menu
  function showTeamSelection() {
    loginForm.style.display = 'none';
    teamSelectionForm.style.display = 'flex';
  }

  // Function to start the game
  function startGame() {
    overlay.style.display = 'none';
    document.body.focus();
    console.log(`🎮 Starting game with team: ${selectedTeam}`);
    
    // Store selected team globally so the game can access it
    window.gameConfig = window.gameConfig || {};
    window.gameConfig.selectedTeam = selectedTeam;
    
    // NOW create the Phaser game AFTER team selection
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
  }

  // Team selection event listeners
  teamBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      selectedTeam = e.target.dataset.team;
      console.log(`Team selected: ${selectedTeam}`);
      
      // Add visual feedback
      document.querySelectorAll('.team-option').forEach(option => {
        option.style.borderColor = '#444444';
      });
      e.target.closest('.team-option').style.borderColor = '#99bb99';
      
      // Start game after team selection
      setTimeout(() => {
        startGame();
      }, 500);
    });
  });

  // Show welcome alert when page loads
  alert("Welcome to Battle Arena!\n\nHow to play:\n- Use arrow keys to move\n- Click to shoot\n- One hit = you're out\n\nBring your friends and have fun!");

});
