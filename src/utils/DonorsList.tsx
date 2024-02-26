import React from "react";
import { XIcon } from "@heroicons/react/outline";
import { lamportsToSol } from "@/utils/lamportsToSol";
import { shortenAddress2 } from "@/utils/shortenAddress";
import styles from "@/styles/DonorsList.module.css";

const DonorsList = ({ pledgers, onClose }) => {
  const explorerBaseUrl = "https://explorer.solana.com";
  const networkParam = "?cluster=devnet";

  if (!pledgers || pledgers.length === 0) {
    return (
      <div className={styles.donorsCard}>
        <div className={styles.closeButtonContainer}>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <ul className={styles.donorsContainer}>
        <li className={styles.donorItem}><strong>Campaign has no supporters.</strong></li>
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.donorsCard}>
      <div className={styles.closeButtonContainer}>
        <button
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close"
        >
          <XIcon className="h-6 w-6" />
        </button>
      </div>
      <ul className={styles.donorsContainer}>
        {pledgers.map((pledger, index) => {
          const explorerUrl = `${explorerBaseUrl}/address/${pledger.pledgerPubkey.toString()}${networkParam}`;
          return (
            <li key={index} className={styles.donorItem}>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.donorLink}
              >
                <strong>
                  {shortenAddress2(pledger.pledgerPubkey.toString())}
                </strong>{" "}
                - supported{" "}
                <strong>
                  {lamportsToSol(Number(pledger.pledgedAmount)).toString()} SOL
                </strong>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DonorsList;
