import type { NextPage } from "next";
import Head from "next/head";
import { CampaignsView } from "../views";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>FundWave</title>
        <meta
          name="description"
          content="FundWave Crowdfunding dApp build on Solana Blockchain"
        />
      </Head>
      <CampaignsView />
    </div>
  );
};

export default Home;
