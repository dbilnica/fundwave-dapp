
import { FC } from "react";
import { ShowPortfolio } from '../../components/portfolio-feature';

export const PortfolioView: FC = ({ }) => {

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className="text-center">
          <ShowPortfolio />
        </div>
      </div>
    </div>
  );
};
