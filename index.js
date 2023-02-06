import { request, gql } from "graphql-request";
import json2csv from "json2csv";

const subgraphUrl = {
  ethereum: "https://api.thegraph.com/subgraphs/name/enzymefinance/enzyme-core",
  polygon: "https://api.thegraph.com/subgraphs/name/enzymefinance/enzyme-core-polygon",
};

const blockNumber = {
  ethereum: 16307890,
  polygon: 37518609,
};

const OwnersQuery = gql`
  query OwnersQuery($block: Int!, $last: String!) {
    accounts(
      block: { number: $block }
      where: { id_gt: $last, isOwner: true }
      first: 1000
      orderBy: id
      orderDirection: asc
    ) {
      id
    }
  }
`;

const DepositorsQuery = gql`
  query DepositorsQuery($block: Int!, $last: String!) {
    accounts(
      block: { number: $block }
      where: { id_gt: $last, isDepositor: true }
      first: 1000
      orderBy: id
      orderDirection: asc
    ) {
      id
    }
  }
`;

async function fetchAccounts(network, query) {
  let output = new Set();
  let last = "";

  while (true) {
    const { accounts } = await request(subgraphUrl[network], query, {
      last,
      block: blockNumber[network],
    });

    const addresses = accounts.map((account) => account.id);
    output = new Set([...output, ...addresses]);

    // If we have less than 1000 accounts, we've reached the end.
    if (addresses.length !== 1000) {
      break;
    }

    last = addresses[addresses.length - 1];
  }

  return output;
}

async function fetchOwnersAndDepositors() {
  const [ethereumOwners, ethereumDepositors, polygonOwners, polygonDepositors] =
    await Promise.all([
      fetchAccounts("ethereum", OwnersQuery),
      fetchAccounts("ethereum", DepositorsQuery),
      fetchAccounts("polygon", OwnersQuery),
      fetchAccounts("polygon", DepositorsQuery),
    ]);

  const addresses = new Set([
    ...ethereumOwners,
    ...ethereumDepositors,
    ...polygonOwners,
    ...polygonDepositors,
  ]);

  return addresses;
}

fetchOwnersAndDepositors().then((addresses) => {
  const csv = json2csv.parse(Array.from(addresses).map((id) => ({ id })));

  process.stdout.write(csv);
});
