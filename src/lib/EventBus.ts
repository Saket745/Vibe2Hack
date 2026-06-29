type EventHandler = (payload: any) => void | Promise<void>;

class EventBusImpl {
  private handlers: Record<string, EventHandler[]> = {};

  /**
   * Subscribe to an event topic.
   */
  public subscribe(topic: string, handler: EventHandler): () => void {
    if (!this.handlers[topic]) {
      this.handlers[topic] = [];
    }
    this.handlers[topic].push(handler);

    // Return unsubscribe function
    return () => {
      this.handlers[topic] = this.handlers[topic].filter(h => h !== handler);
    };
  }

  /**
   * Publish an event payload to a topic.
   */
  public async publish(topic: string, payload: any): Promise<void> {
    console.log(`[EventBus] Published to ${topic}:`, payload);
    const topicHandlers = this.handlers[topic] || [];
    
    // Execute all handlers asynchronously so publishers are not blocked
    setTimeout(async () => {
      for (const handler of topicHandlers) {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in handler for topic ${topic}:`, error);
        }
      }
    }, 0);
  }
}

export const EventBus = new EventBusImpl();
