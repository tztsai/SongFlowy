notes = 'aAbBCdDeEFgG'

major_scale = [2, 2, 1, 2, 2, 2, 1]
minor_scale = [2, 1, 2, 2, 1, 2, 2]

all_keys = [
  'C', 'G', 'D', 'A', 'E', 'B', 
  'F', 'b', 'e', 'a', 'd', 'g',
  'Am', 'Em', 'Bm', 'gm', 'dm', 'am', 
  'em', 'Dm', 'Gm', 'Cm', 'Fm', 'bm'
]

def get_key_scale(key):
    if key[-1] == 'm':
        steps = minor_scale
    else:
        steps = major_scale
    scale = []
    i = notes.index(key[0])
    for s in steps:
        scale.append(notes[i])
        i = (i + s) % 12
    return scale

if __name__ == '__main__':
    for key in all_keys:
        print(f"'{key}': {get_key_scale(key)},")