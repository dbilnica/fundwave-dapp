import React from 'react';

const DonorLink = ({ publicKey }) => {
  const explorerBaseUrl = "https://explorer.solana.com";
  const networkParam = "?cluster=devnet";

  const explorerUrl = `${explorerBaseUrl}/address/${publicKey.toString()}${networkParam}`;

  return (
    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
      {publicKey.toString()}
    </a>
  );
};

const DonorsList = ({ pledgers }) => {
  if (!pledgers || pledgers.length === 0) {
    return <p>No donors yet.</p>;
  }

  return (
    <div>
      <h3>Donors List:</h3>
      <ul>
        {pledgers.map((pledger, index) => (
          <li key={index}>
            Donor Public Key: <DonorLink publicKey={pledger.pledgerPubkey} />, Amount: {pledger.pledgedAmount.toString()} SOL
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DonorsList;
