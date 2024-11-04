import * as React from "react";
import { createRoot } from "react-dom/client";
import { SparkApp, PageContainer, Input, Textarea, Button, Card } from "@github/spark/components";
import { useState } from "react";
import * as d3 from "d3";

function App() {
  const [token, setToken] = useState("");
  const [usernames, setUsernames] = useState("");
  const [connections, setConnections] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previousConnections, setPreviousConnections] = useState(null);

  const handleTokenChange = (event) => {
    setToken(event.target.value);
  };

  const handleUsernamesChange = (event) => {
    setUsernames(event.target.value);
  };

  const calculateConnections = async () => {
    setLoading(true);
    const usernameList = usernames.split("\n").map((username) => username.trim()).filter(Boolean);
    const connectionsSet = new Set();

    for (const username of usernameList) {
      const followers = await fetchFollowers(username);
      for (const follower of followers) {
        if (usernameList.includes(follower)) {
          connectionsSet.add(`${username}-${follower}`);
        }
      }
    }

    setConnections(Array.from(connectionsSet));
    setLoading(false);
  };

  const fetchFollowers = async (username) => {
    const response = await spark.octokit.request('GET /users/{username}/followers', {
      username,
      headers: {
        authorization: `token ${token}`
      }
    });
    return response.data.map((follower) => follower.login);
  };

  const copyToClipboard = () => {
    const json = JSON.stringify(connections, null, 2);
    navigator.clipboard.writeText(json);
  };

  const compareConnections = () => {
    if (!previousConnections || !connections) return 0;
    const previousSet = new Set(previousConnections);
    const currentSet = new Set(connections);
    let newConnections = 0;

    currentSet.forEach(connection => {
      if (!previousSet.has(connection)) {
        newConnections++;
      }
    });

    return newConnections;
  };

  const renderGraph = () => {
    const svg = d3.select("#graph")
      .attr("width", 500)
      .attr("height", 500);

    const nodes = Array.from(new Set(connections.flatMap(connection => connection.split('-'))));
    const links = connections.map(connection => {
      const [source, target] = connection.split('-');
      return { source, target };
    });

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(250, 250));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", 2)
      .attr("stroke", "#999");

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 5)
      .attr("fill", "#69b3a2");

    node.append("title")
      .text(d => d);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });
  };

  React.useEffect(() => {
    if (connections) {
      renderGraph();
    }
  }, [connections]);

  return (
    <PageContainer maxWidth="large">
      <h1 className="text-2xl font-bold mb-4">Connecticut</h1>
      <Card className="mb-4 p-4">
        <Input
          type="password"
          placeholder="Enter GitHub Personal Access Token"
          value={token}
          onChange={handleTokenChange}
          id="github-token"
          className="mb-4"
        />
        <Textarea
          placeholder="Enter GitHub usernames (one per line)"
          value={usernames}
          onChange={handleUsernamesChange}
          rows={10}
          id="github-usernames"
          className="mb-4"
        />
        <Button onClick={calculateConnections} variant="primary" className="mb-4">Calculate Connections</Button>
        {loading && <p>Loading...</p>}
        {connections && (
          <>
            <Button onClick={copyToClipboard} variant="secondary" className="mb-4">Copy Results as JSON</Button>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Connections Table</h2>
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2">Connection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((connection, index) => (
                      <tr key={index}>
                        <td className="py-2">{connection}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Connections Graph</h2>
                <svg id="graph"></svg>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-xl font-semibold">New Connections Formed: {compareConnections()}</h2>
            </div>
          </>
        )}
      </Card>
    </PageContainer>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(
  <SparkApp>
    <App />
  </SparkApp>
);

