import { IContext } from '../types/context';
import { getLogger } from '@server/utils';

const logger = getLogger('AgentChatResolver');

export class AgentChatResolver {
  constructor() {
    this.createChatSession = this.createChatSession.bind(this);
    this.listChatSessions = this.listChatSessions.bind(this);
    this.getChatSession = this.getChatSession.bind(this);
    this.deleteChatSession = this.deleteChatSession.bind(this);
    this.getChatMessages = this.getChatMessages.bind(this);
    this.sendChatMessage = this.sendChatMessage.bind(this);
  }

  // ─── Queries ───────────────────────────────────────────

  public async listChatSessions(
    _root: any,
    args: { agentDefinitionId: number },
    ctx: IContext,
  ) {
    return ctx.agentChatService.listSessions(args.agentDefinitionId);
  }

  public async getChatSession(
    _root: any,
    args: { sessionId: number },
    ctx: IContext,
  ) {
    return ctx.agentChatService.getSession(args.sessionId);
  }

  public async getChatMessages(
    _root: any,
    args: { sessionId: number },
    ctx: IContext,
  ) {
    return ctx.agentChatService.getMessages(args.sessionId);
  }

  // ─── Mutations ─────────────────────────────────────────

  public async createChatSession(
    _root: any,
    args: { agentDefinitionId: number },
    ctx: IContext,
  ) {
    return ctx.agentChatService.createSession(
      ctx.projectId,
      args.agentDefinitionId,
      ctx.currentUser?.id,
    );
  }

  public async sendChatMessage(
    _root: any,
    args: { sessionId: number; content: string },
    ctx: IContext,
  ) {
    return ctx.agentChatService.sendMessage(
      args.sessionId,
      ctx.projectId,
      { content: args.content },
      ctx.currentUser?.id,
    );
  }

  public async deleteChatSession(
    _root: any,
    args: { sessionId: number },
    ctx: IContext,
  ) {
    await ctx.agentChatService.deleteSession(args.sessionId);
    return true;
  }
}
