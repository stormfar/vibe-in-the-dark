import type * as Party from "partykit/server";

export default class TestServer implements Party.Server {
  constructor(readonly room: Party.Room) {}
  
  onConnect(conn: Party.Connection) {
    conn.send("Hello from PartyKit!");
  }
  
  onMessage(message: string) {
    this.room.broadcast(message);
  }
}
