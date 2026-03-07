// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "your_api_key",

  authDomain: "cybermed-fc601.firebaseapp.com",

  databaseURL: "https://cybermed-fc601-default-rtdb.europe-west1.firebasedatabase.app/",

  projectId: "cybermed-fc601",

  storageBucket: "cybermed-fc601.appspot.com",

  messagingSenderId: "411918008907",

  appId: "1:411918008907:web:98d0a568841902783483ce",

  measurementId: "G-0ZWVVGFJPR"

};


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);
const db = getFirestore();

const States = doc(db, "Users/id");
function writeState(){
    const docData = {
        date:"",
        Status:{
            Egregore:0,
            Inmate:0,
            Transmigrator:0
        },
        Utente:'cookie'
    };
    setDoc(States, docData, {merge: true});
}

console.log('Firebase initialized:');
writeState();