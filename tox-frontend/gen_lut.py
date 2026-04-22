import os

lines = []
lines.append('#Created by: Adobe Photoshop Export Color Lookup Plugin')
lines.append('#Copyright: (C) Copyright 2017 RocketStock')
lines.append('TITLE "Cool"')
lines.append('')
lines.append('#LUT size')
lines.append('LUT_3D_SIZE 32')
lines.append('')
lines.append('#data domain')
lines.append('DOMAIN_MIN 0.0 0.0 0.0')
lines.append('DOMAIN_MAX 1.0 1.0 1.0')
lines.append('')
lines.append('#LUT data points')

size = 32
for b_i in range(size):
    for g_i in range(size):
        for r_i in range(size):
            r = r_i / (size - 1)
            g = g_i / (size - 1)
            b = b_i / (size - 1)
            # Cool tint: lower shadows, blue lift, desaturate slightly
            r2 = r * 0.915527
            g2 = g * 0.915527
            b2 = 0.12 + b * (1.0 - 0.12)  # lift blacks in blue channel
            lines.append(f'{r2:.6f} {g2:.6f} {b2:.6f}')

out_path = r'c:\Users\vidhi\Documents\Toxlens\tox-frontend\public\cubicle-99.CUBE'
with open(out_path, 'w') as f:
    f.write('\n'.join(lines))
print('CUBE file written:', len(lines), 'lines')
