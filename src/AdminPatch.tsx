// UNIVERZALNI KOD ZA ČUVANJE DRAFT-A (ZAMENA ZA STARO DUGME)
import React from 'react';

interface PatchProps {
  currentProductId: string;
  mainSrc: string;
  g0Src: string;
  g1Src: string;
  g2Src: string;
  db?: any;
  database?: any;
  firestoreDb?: any;
}

export const AdminPatchButton: React.FC<PatchProps> = ({
  currentProductId,
  mainSrc,
  g0Src,
  g1Src,
  g2Src,
  db,
  database,
  firestoreDb
}) => {
  
  const handleConfirmDraft = async () => {
    console.log("Započeto čuvanje drafta za slotove...");
    const draftPath = `drafts/${currentProductId}`;
    const dataToSave = {
      MAIN: mainSrc,
      G0: g0Src,
      G1: g1Src,
      G2: g2Src,
      updatedAt: new Date().toISOString(),
      status: "DRAFT"
    };

    try {
      if (typeof db !== 'undefined' && typeof db.doc === 'function') {
        await db.doc(draftPath).set(dataToSave, { merge: true });
        alert("Nacrt uspešno sačuvan!");
        return;
      } 
      else if (typeof database !== 'undefined' && typeof database.ref === 'function') {
        await database.ref(draftPath).set(dataToSave);
        alert("Nacrt uspešno sačuvan!");
        return;
      }
      else if (firestoreDb) {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(firestoreDb, "drafts", currentProductId), dataToSave, { merge: true });
        alert("Nacrt uspešno sačuvan!");
        return;
      }
      else {
        // Lokalni fallback ako baza privremeno štuca
        localStorage.setItem(`draft_${currentProductId}`, JSON.stringify(dataToSave));
        alert("Sačuvano lokalno u pretraživaču (Firebase nedostupan).");
      }
    } catch (error) {
      console.error("Greška:", error);
      alert("Greška pri čuvanju.");
    }
  };

  return (
    <div style={{ padding: '10px 0', textAlign: 'center', width: '100%' }}>
      <button 
        onClick={handleConfirmDraft}
        style={{
          backgroundColor: '#007bff',
          color: '#ffffff',
          padding: '10px 24px',
          fontSize: '15px',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          width: '100%',
          maxWidth: '200px'
        }}
      >
        Potvrdi
      </button>
    </div>
  );
};
      
