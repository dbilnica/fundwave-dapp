import React from 'react';

const SearchAndToggleCard = ({ searchQuery, setSearchQuery, toggleCampaignsView, isToggled, setIsToggled }) => {
    // Convert the HEX color to RGB to use in inline style for better opacity control if needed
    const inputBgColor = `rgb(45, 46, 49)`; // Color from your image

    return (
        <div className="flex justify-center items-center my-4 w-full"> {/* Removed h-full to not force full height */}
            <div className="card thick-card-style bg-base-100 shadow-xl mx-2 w-full max-w-2xl"> {/* Adjusted the width here */}
                <div className="card-body">
                    {/* Search Bar - apply the HEX color */}
                    <div className="form-control">
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input input-bordered input-primary w-full"
                            style={{ backgroundColor: inputBgColor }} // Inline style for the background color
                        />
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex justify-center mt-4">
                        <label className="label cursor-pointer">
                            {/* Update the label text here */}
                            <span className="label-text mr-2">Campaigns after deadline</span>
                            <input
                                type="checkbox"
                                checked={isToggled}
                                onChange={() => {
                                    setIsToggled(!isToggled);
                                    toggleCampaignsView();
                                }}
                                className="toggle toggle-primary"
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchAndToggleCard;
