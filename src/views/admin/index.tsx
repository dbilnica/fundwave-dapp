import { FC } from "react";
import { ShowAdmin } from "../../components/admin-feature";

export const AdminView: FC = ({}) => {
  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        {/* CONTENT GOES HERE */}
        <div className="text-center">
          <ShowAdmin />
        </div>
      </div>
    </div>
  );
};
