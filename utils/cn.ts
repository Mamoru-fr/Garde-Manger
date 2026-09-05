type ClassValue = string | undefined | null | false | ClassValue[];

function flatten(classes: ClassValue[]): (string | undefined | null | false)[] {
  const result: (string | undefined | null | false)[] = [];
  
  for (const cls of classes) {
    if (Array.isArray(cls)) {
      result.push(...flatten(cls));
    } else {
      result.push(cls);
    }
  }
  
  return result;
}

export function cn(...classes: ClassValue[]): string {
  return flatten(classes).filter(Boolean).join(' ');
}
