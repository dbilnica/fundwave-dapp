import React from 'react';
import { XIcon } from "@heroicons/react/outline";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { shortenAddress2 } from "@/utils/shortenAddress";
import styles from "@/styles/DonorsList.module.css";

const DonorLink = ({ publicKey }) => {
  const explorerBaseUrl = "https://explorer.solana.com";
  const networkParam = "?cluster=devnet";
  const explorerUrl = `${explorerBaseUrl}/address/${publicKey.toString()}${networkParam}`;
  const shortAddress = shortenAddress2(publicKey.toString());

  return (
    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
      {shortAddress}
    </a>
  );
};

const DonorsList = ({ pledgers, onClose }) => {
  if (!pledgers || pledgers.length === 0) {
    return <p>No donors yet.</p>;
  }

  return (
    <div className={styles.donorsCard}>
      <ul className={styles.donorsContainer}>
        {pledgers.map((pledger, index) => (
          <li key={index} className={styles.donorItem}>
            <strong>
              <DonorLink publicKey={pledger.pledgerPubkey} />
            </strong> - supported <strong>{lamportsToSol(Number(pledger.pledgedAmount)).toString()} SOL</strong>
          </li>
        ))}
      </ul>
      <button onClick={onClose} className={styles.closeButton} aria-label="Close">
        <XIcon className="h-6 w-6" />
      </button>
    </div>
  );
};

export default DonorsList;
