
import { FC } from "react";
import { ShowCampaigns } from '../../components/dashboard-feature';

export const CampaignsView: FC = ({ }) => {

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className="text-center">
          <ShowCampaigns />
        </div>
      </div>
    </div>
  );
};
