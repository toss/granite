export const keyReporter = {
    update(event: { type: string; [key: string]: unknown }) {
      switch (event.type) {
        case 'unstable_server_log': {
          const level = typeof event.level === 'string' ? event.level : 'info';
          const data = event.data;
          const output =
            typeof data === 'string' ? data : Array.isArray(data) ? data.map(String).join(' ') : String(data);

          if (level === 'error') {
            console.error(output);
          } else if (level === 'warn') {
            console.warn(output);
          } else {
            console.log(output);
          }
          break;
        }
        case 'unstable_server_menu_updated': {
          const message = event.message;
          if (typeof message === 'string') {
            console.log(message);
          }
          break;
        }
        case 'unstable_server_menu_cleared':
          break;
        default:
          break;
      }
    },
  };