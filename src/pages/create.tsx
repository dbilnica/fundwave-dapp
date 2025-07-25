import type { NextPage } from "next";
import Head from "next/head";
import { CreateCampaignView } from "../views";

const createCampaign: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Create | FundWave</title>
        <meta
          name="description"
          content="Basic Functionality"
        />
      </Head>
      <CreateCampaignView />
    </div>
  );
};

export default createCampaign;
