import { _colors } from "../../../core/consts/colors.consts";
export function get_line_color(line: string): string {
        const head = line.trim().split(/\s+/, 1)[0]?.toUpperCase() ?? "";
        switch (head) {
            case "FAIL": return "red";
            case "PASS": 
          case "OK:":
            case "OK": return _colors.greenlike;
            case "• ": return _colors.txt.main;
            case "SKIP":
                case "WARN": return _colors.yellowlike;
                case "RUN": return _colors.txt.grey;
            case "DONE": return _colors.greenlike;
            case "===":return _colors.txt.grey;
            case "SUITE:":return _colors.txt.main;
            default: return _colors.txt.grey;
        }
    }
