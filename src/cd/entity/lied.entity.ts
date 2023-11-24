/*
 * Copyright (C) 2023 - present Juergen Zimmermann, Florian Goebel, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Cd } from './cd.entity.js';

@Entity()
export class Lied {
    @Column('int')
    // https://typeorm.io/entities#primary-columns
    // CAVEAT: zuerst @Column() und erst dann @PrimaryGeneratedColumn()
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column('varchar', { unique: true, length: 32 })
    readonly liedTitel!: string;

    @Column('varchar', { length: 16 })
    readonly laenge: string | undefined;

    @ManyToOne(() => Cd, (cd) => cd.lieder)
    @JoinColumn({ name: 'cd_id' })
    cd: Cd | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            liedTitel: this.liedTitel,
            laenge: this.laenge,
        });
}
