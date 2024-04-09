import BasicNode from "./node";
import { Kafka } from "kafkajs";
import { Register } from "./register";

export default class OrganizationNode extends BasicNode {
  constructor(register: Register) {
    super(register);
    this.init().catch((err) => console.error("Initialization error:", err));
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.sendRegistrationInfo("OrganizationNode");
    this.startHeartbeat("OrganizationNode");
  }

  // 特定的组织逻辑
  async handleOrganization(message: string): Promise<void> {
    console.log(
      `Organizing message in OrganizationNode ${this.nodeId}: ${message}`,
    );
    // 实现组织逻辑，如消息格式化、过滤等
  }
}
