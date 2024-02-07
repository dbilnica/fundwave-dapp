
import { FC } from "react";
import { Crowdfunding } from '../../components/create-feature';

export const CreateCampaignView: FC = ({ }) => {

  return (
    <div className="mx-auto p-4 max-w-7xl">
      <div className="md:hero-content flex flex-col">
        <div className="text-center w-full">
          <Crowdfunding />
        </div>
      </div>
    </div>
  );
};
