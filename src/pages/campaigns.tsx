import type { NextPage } from "next";
import Head from "next/head";
import { CampaignsView } from "../views";

const Campaigns: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>FundWave</title>
        <meta
          name="description"
          content="Campaigns"
        />
      </Head>
      <CampaignsView />
    </div>
  );
};

export default Campaigns;
