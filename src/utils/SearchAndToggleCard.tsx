import React from 'react';
import { XIcon } from '@heroicons/react/outline';
import styles from "@/styles/AdminFeature.module.css";

const SearchAndToggleCard = ({ searchQuery, setSearchQuery, toggleCampaignsView, isToggled, setIsToggled, onClose }) => {
    const inputBgColor = `rgb(45, 46, 49)`; 
    const toggleOffColor = 'rgb(75, 85, 99)';
    const toggleOnColor = 'rgb(115, 103, 240)';
    return (
        <div className="flex justify-center items-center w-full">
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

                    <div className="flex justify-center mt-4">
                        <label className="label cursor-pointer">
                        <span className={`label-text ${styles.labelText} mr-2`}>Finalized & Concluded campaigns</span>
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

export default SearchAndToggleCard;
