import React from "react";
import { XIcon } from "@heroicons/react/outline";
import styles from "@/styles/AdminFeature.module.css";

const SearchAndToggleAdmin = ({
  searchQuery,
  setSearchQuery,
  pubkeyNewAdminInput,
  onPubkeyNewAdminInputChange,
  handleTransferOwnership,
  toggleReviewedCampaignsView,
  toggleCanceledCampaignsView,
  isReviewedToggled,
  isCanceledToggled,
  onClose,
}) => {
  const inputBgColor = `rgb(45, 46, 49)`;
  const toggleOffColor = "rgb(75, 85, 99)";
  const toggleOnColor = "rgb(115, 103, 240)";

  return (
    <div className="flex justify-center items-center w-full mb-3">
      <div className="card thick-card-style bg-base-100 shadow-xl mx-2 w-full max-w-xl">
        <div className="card-body">
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
          <div className="flex justify-between items-center flex-col sm:flex-row">
            <label className="label cursor-pointer mb-4 sm:mb-0 sm:mr-4">
              <span className={`label-text ${styles.labelText} mr-2`}>
                Reviewed Campaigns
              </span>
              <input
                type="checkbox"
                checked={isReviewedToggled}
                onChange={toggleReviewedCampaignsView}
                className={`toggle ${
                  isReviewedToggled ? "toggle-on" : "toggle-off"
                }`}
                style={{
                  backgroundColor: isReviewedToggled
                    ? toggleOnColor
                    : toggleOffColor,
                }}
              />
            </label>
            <label className="label cursor-pointer">
              <span className={`label-text ${styles.labelText} mr-2`}>
                Canceled Campaigns
              </span>
              <input
                type="checkbox"
                checked={isCanceledToggled}
                onChange={toggleCanceledCampaignsView}
                className={`toggle ${
                  isCanceledToggled ? "toggle-on" : "toggle-off"
                }`}
                style={{
                  backgroundColor: isCanceledToggled
                    ? toggleOnColor
                    : toggleOffColor,
                }}
              />
            </label>
          </div>
          <div className="flex justify-center items-center flex-col sm:flex-row">
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
