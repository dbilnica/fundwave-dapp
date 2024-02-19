import React from 'react';
import { XIcon } from '@heroicons/react/outline';
import styles from "@/styles/AdminFeature.module.css";

const SearchAndToggleAdmin = ({
  searchQuery, 
  setSearchQuery, 
  pubkeyNewAdminInput, 
  onPubkeyNewAdminInputChange, 
  handleTransferOwnership, 
  toggleCampaignsView, 
  isToggled, 
  setIsToggled,
  onClose
}) => {
  const inputBgColor = `rgb(45, 46, 49)`; 
  const toggleOffColor = 'rgb(75, 85, 99)';
  const toggleOnColor = 'rgb(115, 103, 240)';

  return (
      <div className="flex justify-center items-center w-full">
          <div className="card thick-card-style bg-base-100 shadow-xl mx-2 w-full max-w-xl">
              <div className={`card-body ${styles.cardBody}`}>
                  <div className="form-control">
                      <input
                          type="text"
                          placeholder="Search campaigns..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="input input-bordered input-primary w-full"
                          style={{ backgroundColor: inputBgColor }}
                      />
                  </div>

                  <div className="flex justify-center items-center mb-2 flex-col sm:flex-row">
                      <input
                        id="new-admin-pubkey"
                        type="text"
                        placeholder="Enter new admin public key"
                        value={pubkeyNewAdminInput}
                        onChange={onPubkeyNewAdminInputChange}
                        className="input input-bordered input-primary w-full max-w-xs mb-4 sm:mb-0 sm:mr-4"
                        style={{ backgroundColor: inputBgColor }}
                      />
                      <button
                        className={`btn ${styles.btnOwnership} font-semibold`}
                        onClick={handleTransferOwnership}
                      >
                        Transfer Ownership
                      </button>
                  </div>

                  <div className="flex justify-center items-center mb-3 flex-col sm:flex-row">
                        <label className="label cursor-pointer">
                            <span className={`label-text ${styles.labelText} mr-2`}>Campaigns after deadline</span>
                            <input
                                type="checkbox"
                                checked={isToggled}
                                onChange={() => {
                                    setIsToggled(!isToggled);
                                    toggleCampaignsView();
                                }}
                                className={`toggle ${isToggled ? 'toggle-on' : 'toggle-off'}`}
                                style={{ 
                                  backgroundColor: isToggled ? toggleOnColor : toggleOffColor
                                }}
                            />
                        </label>
                    </div>

                  <button
                      onClick={onClose}
                      className="absolute top-0 right-0 m-2 text-xl"
                      aria-label="Close"
                  >
                      <XIcon className="h-6 w-6" />
                  </button>
              </div>
          </div>
      </div>
  );
};

export default SearchAndToggleAdmin;
