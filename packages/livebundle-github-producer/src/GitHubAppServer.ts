import debug from "debug";
import express from "express";
import http from "http";
import { AddressInfo } from "net";
import { JobQueuer, ServerConfig } from "./types";

const log = debug("livebundle-github:GitHubAppServer");
export class GitHubAppServer {
  private readonly app: express.Application;
  private server: http.Server;

  constructor(
    private readonly config: ServerConfig,
    private readonly jobQueuer: JobQueuer,
  ) {
    log(`Server config : ${JSON.stringify(config, null, 2)}`);
    this.app = express();
    this.app.use(express.json());
    this.createAppRoutes();
  }

  private createAppRoutes() {
    this.app.post("/", async (req, res) => {
      if (["opened", "synchronize"].includes(req.body?.action)) {
        const { installation, repository, number: prNumber } = req.body;
        const installationId = installation.id;
        const owner = repository.owner.login;
        const repo = repository.name;

        this.jobQueuer.queue({
          installationId,
          owner,
          prNumber,
          repo,
        });
      }

      res.json({ ok: 1 });
    });
  }

  public get address(): string {
    if (!this.server) {
      throw new Error("Server is not started");
    }
    return (this.server.address() as AddressInfo).address;
  }

  public get port(): number {
    if (!this.server) {
      throw new Error("Server is not started");
    }
    return (this.server.address() as AddressInfo).port;
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      const { host, port } = this.config;
      this.server =
        this.server ??
        this.app.listen(port, host, () => {
          log(`GitHub app server (job producer) started on ${host}:${port}`);
          resolve();
        });
    });
  }

  public stop(): void {
    this.server && this.server.close();
  }
}