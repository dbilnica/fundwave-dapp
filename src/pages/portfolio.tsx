import type { NextPage } from "next";
import Head from "next/head";
import { PortfolioView } from "../views";

const Portfolio: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Portfolio | FundWave</title>
        <meta
          name="description"
          content="Portfolio"
        />
      </Head>
      <PortfolioView />
    </div>
  );
};

export default Portfolio;
