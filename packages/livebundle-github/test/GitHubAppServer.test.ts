import chai, { expect } from "chai";
import chaiHttp from "chai-http";
import "mocha";
import sinon from "sinon";
import { GitHubAppServer } from "../src/GitHubAppServer";
import { Job, JobRunner, ServerConfig } from "../src/types";

class JobRunnerNullImpl implements JobRunner {
  public run(job: Job): Promise<void> {
    return Promise.resolve();
  }
}

describe("GitHubAppServer", () => {
  chai.use(chaiHttp);

  const serverConfig: ServerConfig = {
    host: "localhost",
    port: 0,
  };

  describe("get address", () => {
    it("should throw if the server is not started", () => {
      const sut = new GitHubAppServer(serverConfig, new JobRunnerNullImpl());
      expect(() => sut.address).to.throw();
    });
  });

  describe("get port", () => {
    it("should throw if the server is not started", () => {
      const sut = new GitHubAppServer(serverConfig, new JobRunnerNullImpl());
      expect(() => sut.port).to.throw();
    });
  });

  describe("functional tests", () => {
    const sandbox = sinon.createSandbox();
    let jobRunnerStub: sinon.SinonStubbedInstance<JobRunnerNullImpl>;

    async function test(
      config: ServerConfig,
      func: (req: ChaiHttp.Agent, server: GitHubAppServer) => Promise<void>,
    ) {
      const serv = new GitHubAppServer(config, jobRunnerStub);
      try {
        await serv.start();
        await func(chai.request(`http://${serv.address}:${serv.port}`), serv);
      } finally {
        serv.stop();
      }
    }

    beforeEach(() => {
      jobRunnerStub = sandbox.createStubInstance(JobRunnerNullImpl);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe("POST /", () => {
      it("should return HTTP 200", async () => {
        await test(serverConfig, async (req) => {
          const res = await req.post("/");
          expect(res).to.have.status(200);
        });
      });

      it("should return { ok: 1 }", async () => {
        await test(serverConfig, async (req) => {
          const res = await req.post("/");
          expect(res.body).eql({ ok: 1 });
        });
      });

      it("should add the job the job manager [opened PR]", async () => {
        await test(serverConfig, async (req) => {
          await req.post("/").send({
            action: "opened",
            installation: { id: 123456 },
            repository: { owner: { login: "foo" }, name: "bar" },
            number: 456789,
          });
          expect(jobRunnerStub.run.calledOnce).true;
        });
      });

      it("should add the job the job manager [updated PR]", async () => {
        await test(serverConfig, async (req) => {
          await req.post("/").send({
            action: "synchronize",
            installation: { id: 123456 },
            repository: { owner: { login: "foo" }, name: "bar" },
            number: 456789,
          });
          expect(jobRunnerStub.run.calledOnce).true;
        });
      });
    });
  });
});
