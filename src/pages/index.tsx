import type { NextPage } from "next";
import Head from "next/head";
import { CampaignsView } from "../views";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta
          name="description"
          content="Solana Scaffold"
        />
      </Head>
      <CampaignsView />
    </div>
  );
};

export default Home;
